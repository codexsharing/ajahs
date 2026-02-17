import fetch from "node-fetch";

async function pinterestSearch(query) {
  if (!query) {
    return { status: false, message: "Query tidak boleh kosong" };
  }

  try {
    const url =
      "https://www.pinterest.com/resource/BaseSearchResource/get/?data=" +
      encodeURIComponent(
        JSON.stringify({
          options: { query: encodeURIComponent(query) }
        })
      );

    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        "screen-dpr": "4",
        "x-pinterest-pws-handler": "www/search/[scope].js"
      }
    });

    if (!res.ok) {
      return { status: false, message: `Error ${res.status}` };
    }

    const linkHeader = res.headers.get("Link");
    if (!linkHeader) {
      return { status: false, message: `Hasil kosong untuk "${query}"` };
    }

    const urls = [...linkHeader.matchAll(/<(.*?)>/gm)]
      .map(a => a[1])
      .slice(0, 10);

    return {
      status: true,
      query,
      total: urls.length,
      results: urls
    };
  } catch (err) {
    return {
      status: false,
      message: err.message
    };
  }
}

// ==== API HANDLER ====
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      status: false,
      message: "GET only"
    });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'query' wajib diisi"
    });
  }

  const result = await pinterestSearch(query);

  if (!result.status) {
    return res.status(500).json(result);
  }

  res.status(200).json(result);
}