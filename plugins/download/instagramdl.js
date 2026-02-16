const axios = require('axios')
const config = require('../../config')

const pluginConfig = {
    name: 'instagramdl',
    alias: ['igdl', 'ig', 'instagram'],
    category: 'download',
    description: 'Download video/foto Instagram',
    usage: '.instagramdl <url>',
    example: '.instagramdl https://www.instagram.com/reel/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}instagramdl <url>\`\n\n` +
            `> Contoh:\n` +
            `> \`${m.prefix}igdl https://www.instagram.com/reel/xxx\``
        )
    }
    
    if (!url.match(/instagram\.com/i)) {
        return m.reply(`❌ URL tidak valid. Gunakan link Instagram.`)
    }
    
    await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ...*`)
    
    try {
        const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-OurinMD'
        const { data } = await axios.get(`https://api.neoxr.eu/api/ig?url=${encodeURIComponent(url)}&apikey=${NEOXR_APIKEY}`)
        
        if (!data?.status) {
            return m.reply(`❌ Gagal mengambil media. Coba link lain.`)
        }
        
        for (const item of data.data) {
            const mediaUrl = item.url

            if(item.type === 'mp4') {
                await sock.sendMessage(m.chat, {
                    video: { url: mediaUrl },
                    caption: `✅ *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n> 🎬 Video`
                }, { quoted: m })
            } else {
                await sock.sendMessage(m.chat, {
                    image: { url: mediaUrl },
                    caption: `✅ *ɪɴsᴛᴀɢʀᴀᴍ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n> 🖼️ Foto`
                }, { quoted: m })
            }
        }
        
    } catch (err) {
        return m.reply(`❌ *ɢᴀɢᴀʟ ᴍᴇɴɢᴜɴᴅᴜʜ*\n\n> ${err.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
