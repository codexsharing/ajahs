import axios from "axios";

async function tiktokDl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      let data = [];

      function formatNumber(integer) {
        let numb = parseInt(integer);
        return Number(numb).toLocaleString().replace(/,/g, ".");
      }

      function formatDate(n, locale = "en") {
        let d = new Date(n * 1000);
        return d.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          second: "numeric"
        });
      }

      let domain = "https://www.tikwm.com/api/";

      let res = await (
        await axios.post(
          domain,
          {},
          {
            headers: {
              Accept: "application/json, text/javascript, */*; q=0.01",
              "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
              Origin: "https://www.tikwm.com",
              Referer: "https://www.tikwm.com/",
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/116.0.0.0 Mobile Safari/537.36",
              "X-Requested-With": "XMLHttpRequest"
            },
            params: {
              url: url,
              count: 12,
              cursor: 0,
              web: 1,
              hd: 1
            }
          }
        )
      ).data.data;

      if (!res) return reject(new Error("Video tidak ditemukan"));

      if (res?.duration == 0) {
        res.images.map((v) => {
          data.push({ type: "photo", url: v });
        });
      } else {
        data.push(
          {
            type: "watermark",
            url: "https://www.tikwm.com" + res?.wmplay
          },
          {
            type: "nowatermark",
            url: "https://www.tikwm.com" + res?.play
          },
          {
            type: "nowatermark_hd",
            url: "https://www.tikwm.com" + res?.hdplay
          }
        );
      }

      resolve({
        status: true,
        title: res.title,
        taken_at: formatDate(res.create_time),
        region: res.region,
        id: res.id,
        duration: res.duration + " Seconds",
        cover: "https://www.tikwm.com" + res.cover,
        data: data,
        music_info: {
          id: res.music_info?.id,
          title: res.music_info?.title,
          author: res.music_info?.author,
          album: res.music_info?.album || null,
          url:
            "https://www.tikwm.com" +
            (res.music || res.music_info?.play || "")
        },
        stats: {
          views: formatNumber(res.play_count),
          likes: formatNumber(res.digg_count),
          comment: formatNumber(res.comment_count),
          share: formatNumber(res.share_count),
          download: formatNumber(res.download_count)
        },
        author: {
          id: res.author?.id,
          fullname: res.author?.unique_id,
          nickname: res.author?.nickname,
          avatar: "https://www.tikwm.com" + res.author?.avatar
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// === API HANDLER ===
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      status: false,
      message: "GET only"
    });
  }

  const url = req.query.url;
  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' wajib diisi"
    });
  }

  try {
    const result = await tiktokDl(url);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    });
  }
}