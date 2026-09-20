const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Media Downloader Backend API is running"
  });
});

function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.substring(1);
    }

    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("www.youtube.com")
    ) {
      return parsed.searchParams.get("v");
    }

    return null;
  } catch {
    return null;
  }
}

function parseDuration(duration) {
  const match = duration.match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/
  );

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

app.post("/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "URL is required"
    });
  }

  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return res.status(400).json({
      success: false,
      message: "Invalid YouTube URL"
    });
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "YouTube API key is not configured"
      });
    }

    const apiUrl =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,contentDetails` +
      `&id=${encodeURIComponent(videoId)}` +
      `&key=${encodeURIComponent(apiKey)}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      console.error("YouTube API error:", data);

      return res.status(400).json({
        success: false,
        message: "YouTube API request failed",
        error: data.error?.message || "Unknown API error"
      });
    }

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Video not found"
      });
    }

    const video = data.items[0];

    const title = video.snippet?.title || "Unknown title";
    const thumbnail =
      video.snippet?.thumbnails?.maxres?.url ||
      video.snippet?.thumbnails?.high?.url ||
      video.snippet?.thumbnails?.medium?.url ||
      video.snippet?.thumbnails?.default?.url ||
      null;

    const duration = parseDuration(
      video.contentDetails?.duration || "PT0S"
    );

    return res.json({
      success: true,
      message: "URL analyzed successfully",
      title: title,
      thumbnail: thumbnail,
      duration: duration,
      formats: [],
      url: url,
      videoId: videoId
    });

  } catch (error) {
    console.error("Analyze error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to analyze this media URL",
      error: error.message || "Unknown error"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
