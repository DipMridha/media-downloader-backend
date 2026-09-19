const express = require("express");
const cors = require("cors");
const youtubedl = require("youtube-dl-exec");

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

app.post("/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "URL is required"
    });
  }

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      skipDownload: true,
      noPlaylist: true
    });

    const formats = (info.formats || [])
      .filter(format => format.url)
      .map(format => ({
        id: format.format_id || "unknown",
        type: format.vcodec === "none" ? "audio" : "video",
        quality: format.height
          ? `${format.height}p`
          : (format.format_note || "Original"),
        mimeType: format.ext
          ? `${format.vcodec === "none" ? "audio" : "video"}/${format.ext}`
          : "application/octet-stream",
        size: format.filesize || format.filesize_approx || 0,
        downloadUrl: format.url
      }));

    return res.json({
      success: true,
      message: "URL analyzed successfully",
      thumbnail: info.thumbnail || null,
      duration: Math.round(info.duration || 0),
      formats: formats,
      url: url
    });

  } catch (error) {
    console.error("Analyze error:", error);

    return res.status(400).json({
      success: false,
      message: "Unable to analyze this media URL"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
