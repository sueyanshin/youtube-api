import express from "express";
import cors from "cors";
import { Innertube } from "youtubei.js";

const app = express();
app.use(cors());
app.use(express.json());

let youtube;

let youtubeReady = (async () => {
  youtube = await Innertube.create();
  console.log("✅ YouTube API initialized");
})();

// API route
app.get("/", async (req, res) => {
  try {
    res.json("Hello World");
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ error: error.message });
  }
});


// API route
app.get("/video/transcript", async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) {
      return res.status(400).json({ error: "Missing videoId parameter" });
    }

    // ✅ Ensure YouTube is ready before use
    await youtubeReady;

    const info = await youtube.getInfo(videoId);
    const transcript = await info.getTranscript();

    if (!transcript || transcript.length === 0) {
      return res.status(404).json({ error: "Transcript not available for this video" });
    }

    res.json(transcript);
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ error: error.message });
  }
});


/**
 * 2️⃣ Get Video Info (title, author, views, etc.)
 */
app.get("/video/info", async (req, res) => {
  try {
    const { videoId } = req.query;
    if (!videoId) return res.status(400).json({ error: "Missing videoId parameter" });

    // ✅ Ensure YouTube is ready before use
    await youtubeReady;

    const info = await youtube.getInfo(videoId);
    const details = info.basic_info;

    const videoInfo = {
      id: details.id,
      title: details.title,
      author: details.author,
      description: details.short_description,
      duration: details.duration,
      views: details.view_count,
      thumbnails: details.thumbnail,
      uploadDate: details.upload_date,
      category: details.category,
    };

    res.json(videoInfo);
  } catch (error) {
    console.error("Error fetching video info:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 3️⃣ Get Video Streaming URLs
 */
app.get("/video", async (req, res) => {
  try {
    const { videoId, quality } = req.query;
    if (!videoId) return res.status(400).json({ error: "Missing videoId parameter" });

    // ✅ Ensure YouTube is ready before use
    await youtubeReady;

    const info = await youtube.getInfo(videoId);
    const formats = info.streaming_data?.formats || [];

    if (formats.length === 0)
      return res.status(404).json({ error: "No playable formats available" });

    // Default to highest quality if not specified
    let selectedFormat;
    if (quality) {
      selectedFormat = formats.find(f => f.quality_label === quality);
    }
    if (!selectedFormat) {
      selectedFormat = formats[formats.length - 1];
    }

    const videoUrl = selectedFormat.url;

    res.json({
      videoId,
      quality: selectedFormat.quality_label,
      mimeType: selectedFormat.mime_type,
      url: videoUrl,
    });
  } catch (error) {
    console.error("Error fetching video URL:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * 4️⃣ Search YouTube Videos
 */
app.get("/video/search", async (req, res) => {
  try {
    const { query, limit } = req.query;
    if (!query) return res.status(400).json({ error: "Missing query parameter" });

    // ✅ Ensure YouTube is ready before use
    await youtubeReady;
    
    const results = await youtube.search(query, { type: "video" });
    const videos = results.videos.slice(0, limit ? parseInt(limit) : 10).map(v => ({
      id: v.id,
      title: v.title,
      author: v.author?.name,
      duration: v.duration,
      views: v.view_count,
      thumbnails: v.thumbnails,
      description: v.description,
      uploadedAt: v.published,
    }));

    res.json(videos);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: error.message });
  }
});
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

export default app;