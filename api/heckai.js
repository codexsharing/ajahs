import axios from "axios"

/* ========================= */
/* CONFIG                    */
/* ========================= */

const BASE_URL = "https://api.heckai.weight-wave.com/api/ha/v1"
const API_KEY = "" // isi kalau ada

let currentSessionId = null

/* ========================= */
/* AUTO CREATE SESSION       */
/* ========================= */

async function ensureSession(title = "New Chat") {
  if (currentSessionId) return currentSessionId

  const res = await axios.post(
    `${BASE_URL}/session/create`,
    { title },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      }
    }
  )

  currentSessionId = res.data.id
  return currentSessionId
}

/* ========================= */
/* SEND CHAT (AUTO SESSION)  */
/* ========================= */

async function heckaiChat(question) {
  const sessionId = await ensureSession("Auto Session")

  const res = await axios.post(
    `${BASE_URL}/chat`,
    {
      model: "openai/gpt-5-mini",
      question,
      language: "English",
      sessionId,
      previousQuestion: null,
      previousAnswer: null
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      },
      responseType: "stream"
    }
  )

  return new Promise((resolve, reject) => {
    let answer = ""
    let isAnswer = false

    res.data.on("data", chunk => {
      const lines = chunk.toString().split("\n")

      for (let line of lines) {
        if (!line.startsWith("data:")) continue
        const data = line.replace("data:", "").trim()

        if (data === "[ANSWER_START]") {
          isAnswer = true
          continue
        }

        if (data === "[ANSWER_DONE]") {
          resolve({
            session_id: sessionId,
            text: answer.trim()
          })
          return
        }

        if (isAnswer && data) {
          answer += data + " "
        }
      }
    })

    res.data.on("error", reject)
  })
}

/* ========================= */
/* SERVERLESS HANDLER (GET)  */
/* ========================= */

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      status: false,
      message: "GET only"
    })
  }

  const q = req.query.q || req.query.text

  if (!q) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'q' wajib diisi"
    })
  }

  try {
    const result = await heckaiChat(q)

    res.status(200).json({
      status: true,
      model: "HeckAI",
      question: q,
      answer: result.text,
      session_id: result.session_id
    })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.response?.data || err.message
    })
  }
}