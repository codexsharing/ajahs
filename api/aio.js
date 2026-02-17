import axios from "axios"
import * as cheerio from "cheerio"

export default async function handler(req, res) {

  // ✅ CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    })
  }

  try {
    const { url } = req.query

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL parameter is required",
        example: "/api/aio?url=VIDEO_URL"
      })
    }

    const platform = detectPlatform(url)
    let results

    if (platform === "tiktok") {
      results = await scrapeTikTok(url)
    } else if (platform === "youtube") {
      results = await scrapeYouTube(url)
    } else if (platform === "instagram") {
      results = await scrapeInstagram(url)
    } else {
      results = await scrapeOn4t(url)
    }

    return res.status(200).json({
      success: true,
      platform,
      original_url: url,
      download_time: new Date().toISOString(),
      results
    })

  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message
    })
  }
}

/* ============================= */

function detectPlatform(url) {
  if (url.includes("tiktok")) return "tiktok"
  if (url.includes("youtube") || url.includes("youtu.be")) return "youtube"
  if (url.includes("instagram")) return "instagram"
  if (url.includes("facebook") || url.includes("fb.watch")) return "facebook"
  return "unknown"
}

/* ============================= */
/* TikTok */
async function scrapeTikTok(url) {
  const { data } = await axios.get("https://www.tikwm.com/api/", {
    params: { url, hd: 1 }
  })

  if (!data?.data) throw new Error("TikTok fetch failed")

  const d = data.data

  return [{
    title: d.title || "TikTok Video",
    thumbnail: d.cover,
    duration: d.duration,
    download_url: d.play,
    hd_url: d.hdplay || d.play,
    author: d.author,
    platform: "tiktok"
  }]
}

/* ============================= */
/* YouTube */
async function scrapeYouTube(url) {
  const { data } = await axios.get("https://co.wuk.sh/api/json", {
    params: {
      url,
      isAudioOnly: false,
      isNoTTWatermark: true
    }
  })

  if (!data?.url) throw new Error("YouTube fetch failed")

  return [{
    title: data.meta?.title || "YouTube Video",
    thumbnail: data.meta?.thumb,
    download_url: data.url,
    quality: data.selectedFormat?.quality || "HD",
    platform: "youtube"
  }]
}

/* ============================= */
/* Instagram */
async function scrapeInstagram(url) {
  const { data } = await axios.get("https://igram.io/api/ig", {
    params: { url }
  })

  if (!data?.data) throw new Error("Instagram fetch failed")

  const d = data.data
  const results = []

  if (d.video_versions?.length) {
    results.push({
      title: d.caption?.text || "Instagram Video",
      thumbnail: d.image_versions2?.candidates?.[0]?.url,
      download_url: d.video_versions[0].url,
      platform: "instagram"
    })
  }

  if (d.image_versions2?.candidates?.length) {
    d.image_versions2.candidates.forEach((img, i) => {
      results.push({
        title: `Instagram Image ${i + 1}`,
        thumbnail: img.url,
        download_url: img.url,
        platform: "instagram"
      })
    })
  }

  return results
}

/* ============================= */
/* Fallback on4t */
async function scrapeOn4t(url) {
  const initialUrl = "https://on4t.com/online-video-downloader"

  const initial = await axios.get(initialUrl)
  const $ = cheerio.load(initial.data)

  const token = $('meta[name="csrf-token"]').attr("content")
  if (!token) throw new Error("CSRF token not found")

  const postData = new URLSearchParams()
  postData.append("_token", token)
  postData.append("link[]", url)

  const { data } = await axios.post(
    "https://on4t.com/all-video-download",
    postData.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }
  )

  if (!data?.result?.length) {
    throw new Error("No download links found")
  }

  return data.result.map(item => ({
    title: item.title || "Download",
    thumbnail: item.image || item.videoimg_file_url,
    download_url: item.video_file_url || item.videoimg_file_url,
    quality: item.quality || "HD",
    size: item.size || null,
    duration: item.duration || null,
    platform: "auto"
  }))
}