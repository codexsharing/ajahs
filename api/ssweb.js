import axios from "axios";

async function ssweb(url) {
  try {
    if (!url) throw new Error("URL tidak boleh kosong");

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = "https://" + finalUrl;
    }

    const response = await axios.get("https://api.pikwy.com/", {
      params: {
        tkn: 125,
        d: 3000,
        u: encodeURIComponent(finalUrl),
        fs: 0,
        w: 1280,
        h: 1200,
        s: 100,
        z: 100,
        f: "jpg",
        rt: "jweb"
      },
      headers: {
        Accept: "*/*"
      }
    });

    if (!response.data?.iurl) {
      throw new Error("Gagal mengambil screenshot");
    }

    return {
      status: true,
      website: finalUrl,
      screenshot: response.data.iurl
    };
  } catch (err) {
    return {
      status: false,
      message: err.message
    };
  }
}

// === API HANDLER ===
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      status: false,
      message: "GET only"
    });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'url' wajib diisi"
    });
  }

  const result = await ssweb(url);

  if (!result.status) {
    return res.status(500).json(result);
  }

  res.status(200).json(result);
}