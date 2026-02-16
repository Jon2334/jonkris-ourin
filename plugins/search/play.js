

const yts = require("yt-search")
const axios = require("axios")
const config = require("../../config")
const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-OurinMD"

const pluginConfig = {
    name: "play",
    alias: ["p"],
    category: "search",
    description: "Putar musik dari YouTube (format audio)",
    usage: ".play <query>",
    example: ".play komang",
    cooldown: 20,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    if (!query) return m.reply(`🎵 *ᴘʟᴀʏ ᴀᴜᴅɪᴏ*\n\n> Contoh:\n\`${m.prefix}play2 komang\``)

    m.react("🎧")

    try {
        const search = await yts(query)
        if (!search.videos.length) throw "Video tidak ditemukan"
        
        const video = search.videos[0]
        const ytUrl = video.url
        
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(ytUrl)}&type=audio&quality=128kbps&apikey=${NEOXR_APIKEY}`
        const { data } = await axios.get(api, { timeout: 60000 })
        
        if (!data.status || !data.data?.url) throw "Gagal ambil audio dari API"
        
        const audioUrl = data.data.url
        
        const tmpDir = path.join(process.cwd(), 'temp')
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true })
        }
        
        const rawPath = path.join(tmpDir, `raw-${Date.now()}.bin`)
        const mp3Path = path.join(tmpDir, `audio-${Date.now()}.mp3`)
        
        const audio = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" },
            timeout: 120000
        })
        
        fs.writeFileSync(rawPath, Buffer.from(audio.data))
        
        await new Promise((resolve, reject) => {
            exec(
                `ffmpeg -y -i "${rawPath}" -vn -acodec libmp3lame -ab 128k "${mp3Path}"`,
                { timeout: 60000 },
                err => err ? reject(err) : resolve()
            )
        })
        
        let thumbnail = null
        try {
            const thumbRes = await axios.get(video.thumbnail, { 
                responseType: "arraybuffer",
                timeout: 30000 
            })
            thumbnail = Buffer.from(thumbRes.data)
        } catch {}
        
        await sock.sendMessage(m.chat, {
            audio: fs.readFileSync(mp3Path),
            mimetype: "audio/mpeg",
            ptt: false,
            fileLength: 99999999999999,
            fileName: `${video.title}.mp3`,
             contextInfo: {
                isForwarded: true,
                forwardingScore: 999,
                externalAdReply: {
                    title: video.title,
                    body: `${video.duration} | ${video.author.name}`,
                    thumbnailUrl: video.thumbnail,
                    sourceUrl: ytUrl,
                    mediaUrl: ytUrl,
                    mediaType: 2,
                    renderLargerThumbnail: true
                },
            }
        }, { quoted: {
            key: {
                participant: `0@s.whatsapp.net`,
                ...(m.chat ? {
                remoteJid: `status@broadcast`
                } : {})
                },
            message: {
                'contactMessage': {
                'displayName': `${config.bot?.name}`,
                'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
            sendEphemeral: true
        }}}  })
            
        
        fs.unlinkSync(rawPath)
        fs.unlinkSync(mp3Path)
        
        m.react("✅")

    } catch (err) {
        console.error('[Play2] Error:', err)
        m.react("❌")
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${err.message || err}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
