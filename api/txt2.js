import axios from 'axios'
import FormData from 'form-data'

const aiLabs = {
  api: {
    base: 'https://text2video.aritek.app',
    endpoints: {
      text2img: '/text2img',
      generate: '/txt2videov3',
      video: '/video'
    }
  },

  headers: {
    'user-agent': 'NB Android/1.0.0',
    'accept-encoding': 'gzip',
    'content-type': 'application/json',
    authorization: ''
  },

  state: { token: null },

  setup: {
    cipher: 'hbMcgZLlzvghRlLbPcTbCpfcQKM0PcU0zhPcTlOFMxBZ1oLmruzlVp9remPgi0QWP0QW',
    shiftValue: 3,

    dec(text, shift) {
      return [...text].map(c =>
        /[a-z]/.test(c)
          ? String.fromCharCode((c.charCodeAt(0) - 97 - shift + 26) % 26 + 97)
          : /[A-Z]/.test(c)
          ? String.fromCharCode((c.charCodeAt(0) - 65 - shift + 26) % 26 + 65)
          : c
      ).join('')
    },

    async decrypt() {
      if (aiLabs.state.token) return aiLabs.state.token
      const token = aiLabs.setup.dec(
        aiLabs.setup.cipher,
        aiLabs.setup.shiftValue
      )
      aiLabs.state.token = token
      aiLabs.headers.authorization = token
      return token
    }
  },

  deviceId() {
    return Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  },

  async text2img(prompt) {
    await aiLabs.setup.decrypt()
    const form = new FormData()
    form.append('prompt', prompt)
    form.append('token', aiLabs.state.token)

    const res = await axios.post(
      aiLabs.api.base + aiLabs.api.endpoints.text2img,
      form,
      { headers: { ...aiLabs.headers, ...form.getHeaders() } }
    )

    if (res.data?.code !== 0 || !res.data?.url) {
      throw new Error('Gagal generate image')
    }

    return {
      type: 'image',
      url: res.data.url.trim(),
      prompt
    }
  },

  async generateVideo(prompt) {
    await aiLabs.setup.decrypt()

    const payload = {
      deviceID: aiLabs.deviceId(),
      isPremium: 1,
      prompt,
      used: [],
      versionCode: 59
    }

    const gen = await axios.post(
      aiLabs.api.base + aiLabs.api.endpoints.generate,
      payload,
      { headers: aiLabs.headers }
    )

    const key = gen.data?.key
    if (!key) throw new Error('Key video tidak valid')

    return await aiLabs.getVideo(key)
  },

  async getVideo(key) {
    const payload = { keys: [key] }

    for (let i = 0; i < 100; i++) {
      const res = await axios.post(
        aiLabs.api.base + aiLabs.api.endpoints.video,
        payload,
        { headers: aiLabs.headers, timeout: 15000 }
      )

      const data = res.data?.datas?.[0]
      if (data?.url) {
        return {
          type: 'video',
          url: data.url.trim(),
          safe: data.safe === 'true',
          key
        }
      }

      await new Promise(r => setTimeout(r, 2000))
    }

    throw new Error('Timeout video generation')
  }
}

export default async function handler(req, res) {
  try {
    const prompt = String(req.query.prompt || '').trim()
    const type = req.query.type === 'image' ? 'image' : 'video'

    if (!prompt) {
      return res.json({
        success: false,
        message: 'parameter prompt wajib diisi'
      })
    }

    const result =
      type === 'image'
        ? await aiLabs.text2img(prompt)
        : await aiLabs.generateVideo(prompt)

    res.json({
      success: true,
      creator: 'ZionJS',
      result
    })
  } catch (e) {
    res.json({
      success: false,
      message: e.message
    })
  }
}