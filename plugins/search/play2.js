const yts = require("yt-search")
const axios = require("axios")
const config = require("../../config")
const sharp = require("sharp")
const fs = require("fs")
const path = require("path")
const { exec } = require("child_process")

const NEOXR_APIKEY = config.APIkey?.neoxr || "Milik-Bot-OurinMD"

const pluginConfig = {
    name: "play2",
    alias: ["p2"],
    category: "search",
    description: "Putar musik dari YouTube",
    usage: ".play2 <query>",
    cooldown: 20,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    if (!query) return m.reply(`Contoh:\n${m.prefix}play komang`)

    m.react("🎧")

    try {
        const search = await yts(query)
        if (!search.videos.length) throw "Video tidak ditemukan"
        const video = search.videos[0]
        const ytUrl = video.url
        const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(ytUrl)}&type=audio&quality=128kbps&apikey=${NEOXR_APIKEY}`
        const { data } = await axios.get(api)
        if (!data.status || !data.data?.url) throw "Gagal ambil audio"
        const audioUrl = data.data.url
        const rawPath = path.join(__dirname, "../../temp", `raw-${Date.now()}.bin`)
        const mp3Path = path.join(__dirname, "../../temp", `audio-${Date.now()}.mp3`)
        const audio = await axios.get(audioUrl, {
            responseType: "arraybuffer",
            headers: { "User-Agent": "Mozilla/5.0" }
        })
        fs.writeFileSync(rawPath, Buffer.from(audio.data))
        await new Promise((resolve, reject) => {
            exec(
                `ffmpeg -y -i "${rawPath}" -vn -acodec libmp3lame -ab 128k "${mp3Path}"`,
                err => err ? reject(err) : resolve()
            )
        })
        const thumb = await axios.get(video.thumbnail, { responseType: "arraybuffer" })
        await sock.sendMessage(m.chat, {
            document: fs.readFileSync(mp3Path),
            mimetype: "audio/mpeg",
            fileName: `${video.title}.mp3`,
            jpegThumbnail: await sharp(Buffer.from(((await axios.get(video.image, { responseType: "arraybuffer" })).data))).resize(300, 300).toBuffer(),
            fileLength: 99999999999999,
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
                participant: `13135550002@s.whatsapp.net`,
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
        console.error(err)
        m.react("❌")
        m.reply("Gagal memproses audio")
    }
}

module.exports = {
    config: pluginConfig,
    handler
}