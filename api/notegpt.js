import axios from "axios";

// Fungsi NoteGPT (streaming)
async function notegpt(message, options = {}) {
  const conversation_id =
    Date.now().toString(16) + "-" + Math.random().toString(16).slice(2, 10);

  const payload = {
    message,
    language: "auto",
    model: "gpt-4.1-mini",
    tone: "default",
    length: "moderate",
    conversation_id,
    image_urls: [],
    chat_mode: "standard",
    ...options
  };

  try {
    const res = await axios.post(
      "https://notegpt.io/api/v2/chat/stream",
      payload,
      {
        headers: { "Content-Type": "application/json" },
        responseType: "stream"
      }
    );

    return new Promise((resolve, reject) => {
      let fullText = "";

      res.data.on("data", chunk => {
        const lines = chunk.toString().split("\n");

        for (let line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.text) fullText += parsed.text;
            if (parsed.done) resolve({ conversation_id, text: fullText });
          } catch {
            // skip invalid JSON
          }
        }
      });

      res.data.on("error", err => reject(err));
    });
  } catch (err) {
    throw new Error(err.message);
  }
}

// Serverless handler (GET)
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ status: false, message: "GET only" });
  }

  const q = req.query.q || req.query.text;
  if (!q) return res.status(400).json({ status: false, message: "Parameter 'q' wajib diisi" });

  try {
    const result = await notegpt(q);
    res.status(200).json({
      status: true,
      model: "NoteGPT",
      question: q,
      answer: result.text,
      conversation_id: result.conversation_id
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
}