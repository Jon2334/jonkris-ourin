const yts = require("yt-search")
const axios = require("axios")
const config = require("../../config")

async function run(url) {
    let attempts = 0;
    while (attempts < 20) {
        attempts++;
        try {
            const res = await axios.get(`https://youtubedl.siputzx.my.id/download?type=audio&url=${encodeURIComponent(url)}`, {
                headers: { "Accept": "application/json, text/plain, */*" }
            })

            const data = res.data
            
            if (data.status === "completed") {
                return "https://youtubedl.siputzx.my.id" + data.fileUrl
            }
            
            if (data.status === "processing") {
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (e) {
             console.error("[Play3] Error pulling:", e.message)
             await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error("Timeout generating audio");
}

const pluginConfig = {
    name: "play3",
    alias: ["playaudio3"],
    category: "search",
    description: "Putar musik dari YouTube (Siputzx API)",
    usage: ".play3 <query>",
    example: ".play3 komang",
    cooldown: 15,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock, text }) {
    const query = m.text?.trim()
    if (!query) return m.reply(`🎵 *ᴘʟᴀʏ 3*\n\n> Contoh:\n\`${m.prefix}play3 komang\``)

    m.react("🎧")

    try {
        const search = await yts(query)
        if (!search.videos.length) throw "Video tidak ditemukan"
        
        const video = search.videos[0]
        const { title, url, timestamp, views, author, thumbnail } = video

        const audioUrl = await run(url)

        const caption = `*${title}*\n\n` +
                        `*Author :* ${author.name}\n` +
                        `*Views :* ${views}\n` +
                        `*Duration :* ${timestamp}\n` +
                        `*Link :* ${url}\n\n` +
                        `> Sending Audio...`

        await sock.sendMessage(m.chat, { 
            image: { url: thumbnail }, 
            caption: caption 
        }, { quoted: m })
        await sock.sendMessage(m.chat, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            ptt: false,
            fileName: `${title}.mp3`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: title,
                    body: author.name,
                    thumbnailUrl: thumbnail,
                    sourceUrl: url,
                    mediaUrl: url,
                    mediaType: 2,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

        m.react("✅")

    } catch (err) {
        console.error('[Play3]', err)
        m.react("❌")
        m.reply(`❌ *Error*: ${err.message || err}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
