export default async function handler(req, res) {
  try {
    const q = req.query.text || req.query.q
if(!q){
  return res.json({
    status:false,
    message:'parameter text / q wajib diisi'
  })
}

    class GeminiClient {
      constructor() {
        this.s = null
        this.r = 1
      }

      async init() {
        const r = await fetch("https://gemini.google.com/", {
          headers: {
            "user-agent":
              "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Mobile"
          }
        })
        const h = await r.text()
        this.s = {
          a: h.match(/"SNlM0e":"(.*?)"/)?.[1] || "",
          b: h.match(/"cfb2h":"(.*?)"/)?.[1] || "",
          c: h.match(/"FdrFJe":"(.*?)"/)?.[1] || ""
        }
      }

      async ask(msg, sys = `✨ Gue Hoshino AI, sistem auto-intelligent assistant. ✨

TUGASKU:
- Pahami maksud user.
- Jawab cepat, rapi, tanpa ribet.
- Bisa coding, rewrite, analisa, dan lainnya.
- Selalu jawab santai tapi jelas.

Jika user minta info, jelasin.
Jika user minta ngerap, bikin.
Jika user minta coding, generate.

Gaya bicara: casual profesional, friendly, gak kaku.
Selalu jawab langsung inti.`) {
        if (!this.s) await this.init()

        const payload = [
          null,
          JSON.stringify([
            [msg, 0, null, null, null, null, 0],
            ["id"],
            ["", "", "", null, null, null, null, null, null, ""],
            null, null, null, [1], 1, null, null, 1, 0, null, null,
            null, null, null, [[0]], 1, null, null, null, null, null,
            ["", "", sys, null, null, null, null, null, 0, null, 1, null, null, null, []],
            null, null, 1, null, null, null, null, null, null, null,
            [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20],
            1, null, null, null, null, [1]
          ])
        ]

        const qs = `bl=${this.s.b}&f.sid=${this.s.c}&hl=id&_reqid=${this.r++}&rt=c`

        const r = await fetch(
          `https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?${qs}`,
          {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
              "user-agent":
                "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/137 Mobile",
              "x-same-domain": "1"
            },
            body: `f.req=${encodeURIComponent(JSON.stringify(payload))}&at=${this.s.a}`
          }
        )

        const text = await r.text()
        const lines = text.split("\n")
        let result = ""

        for (const ln of lines) {
          if (!ln.startsWith('[["wrb.fr"')) continue
          try {
            const jsonStr = JSON.parse(ln)[0][2]
            const d = JSON.parse(jsonStr)
            const arr = d?.[4]
            if (Array.isArray(arr)) {
              const last = arr[arr.length - 1]?.[1]?.[0]
              if (typeof last === "string") result = last
            }
          } catch {}
        }

        return result
      }
    }

    const gemini = new GeminiClient()
    const answer = await gemini.ask(q)

    return res.status(200).json({
      status: true,
      model: "gemini-web",
      response: answer
    })

  } catch (e) {
    return res.status(500).json({
      status: false,
      error: e.message
    })
  }
}