const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


// =========================
// HOME
// =========================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Media Downloader Backend API is running"
  });
});


// =========================
// ANALYZE MEDIA
// =========================

app.post("/analyze", async (req, res) => {

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      message: "URL is required"
    });
  }

  const apiKey = process.env.EASYDOWN_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "EasyDown API key is not configured"
    });
  }

  try {

    const response = await fetch(
      "https://api.easydown.org/api/v1/parse",
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          url: url
        })
      }
    );

    const result = await response.json();


    // EasyDown error
    if (!response.ok) {

      console.error(
        "EasyDown API error:",
        result
      );

      return res.status(response.status).json({
        success: false,

        message:
          result?.msg ||
          result?.message ||
          "Unable to analyze this URL"
      });
    }


    const media = result?.data;


    if (!media) {

      return res.status(404).json({
        success: false,
        message: "No media information found"
      });
    }


    const formats = [];


    // =========================
    // VIDEO FORMATS
    // =========================

    if (Array.isArray(media.videos)) {

      media.videos.forEach(
        (video, index) => {

          if (!video?.url) {
            return;
          }


          const quality =
            video.quality ||
            (
              video.height
                ? `${video.height}p`
                : `Video ${index + 1}`
            );


          formats.push({

            // Unique ID for Android
            id: `video_${index}`,

            type: "video",

            quality: quality,

            url: video.url,

            downloadUrl: video.url,

            mimeType:
              video.mimeType ||
              "video/mp4",

            width:
              video.width ||
              null,

            height:
              video.height ||
              null,

            hasAudio:
              video.hasAudio ??
              true,

            headers:
              video.headers ||
              {},

            size:
              video.size ||
              video.filesize ||
              0

          });

        }
      );
    }


    // =========================
    // AUDIO FORMATS
    // =========================

    if (Array.isArray(media.audios)) {

      media.audios.forEach(
        (audio, index) => {

          if (!audio?.url) {
            return;
          }


          formats.push({

            // Unique ID for Android
            id: `audio_${index}`,

            type: "audio",

            quality:
              audio.quality ||
              (
                audio.bitrate
                  ? `${audio.bitrate} kbps`
                  : `Audio ${index + 1}`
              ),

            url: audio.url,

            downloadUrl: audio.url,

            mimeType:
              audio.mimeType ||
              "audio/mpeg",

            bitrate:
              audio.bitrate ||
              null,

            headers:
              audio.headers ||
              {},

            size:
              audio.size ||
              audio.filesize ||
              0

          });

        }
      );
    }


    // =========================
    // RESPONSE
    // =========================

    return res.json({

      success: true,

      message:
        "URL analyzed successfully",

      platform:
        media.platform ||
        "unknown",

      title:
        media.title ||
        "Media",

      thumbnail:
        media.thumbnail ||
        null,

      duration:
        media.duration ||
        0,

      formats:
        formats,

      url:
        url

    });


  } catch (error) {

    console.error(
      "Analyze error:",
      error
    );

    return res.status(500).json({

      success: false,

      message:
        "Unable to analyze this media URL",

      error:
        error.message ||
        "Unknown error"

    });

  }

});


// =========================
// DOWNLOAD MEDIA
// =========================

app.get("/download", async (req, res) => {

  const {
    url,
    headers
  } = req.query;


  if (!url) {

    return res.status(400).json({
      success: false,
      message: "Download URL is required"
    });

  }


  try {

    const requestHeaders = {

      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36"

    };


    // =========================
    // CUSTOM HEADERS
    // =========================

    if (headers) {

      try {

        const extraHeaders =
          JSON.parse(headers);


        Object.keys(extraHeaders)
          .forEach((key) => {

            requestHeaders[key] =
              extraHeaders[key];

          });


      } catch {

        console.log(
          "Invalid custom headers"
        );

      }

    }


    // =========================
    // FETCH MEDIA
    // =========================

    const response =
      await fetch(
        url,
        {
          headers:
            requestHeaders,

          redirect:
            "follow"
        }
      );


    if (!response.ok) {

      return res.status(400).json({

        success: false,

        message:
          "Unable to download media"

      });

    }


    // =========================
    // CONTENT TYPE
    // =========================

    const contentType =
      response.headers.get(
        "content-type"
      ) ||
      "application/octet-stream";


    // =========================
    // FILE NAME
    // =========================

    let filename =
      "media";


    if (
      contentType.includes(
        "video"
      )
    ) {

      filename +=
        ".mp4";

    }

    else if (
      contentType.includes(
        "audio"
      )
    ) {

      filename +=
        ".mp3";

    }

    else {

      filename +=
        ".bin";

    }


    // =========================
    // RESPONSE HEADERS
    // =========================

    res.setHeader(

      "Content-Disposition",

      `attachment; filename="${filename}"`

    );


    res.setHeader(

      "Content-Type",

      contentType

    );


    // =========================
    // DOWNLOAD BUFFER
    // =========================

    const buffer =
      Buffer.from(
        await response.arrayBuffer()
      );


    res.send(buffer);


  } catch (error) {

    console.error(
      "Download error:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        "Download failed"

    });

  }

});


// =========================
// START SERVER
// =========================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Server running on port ${PORT}`
    );

  }
);
