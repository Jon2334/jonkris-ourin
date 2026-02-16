const axios = require('axios')
const config = require('../../config')

const pluginConfig = {
    name: 'stickerpack',
    alias: ['sp', 'stickersearch', 'searchsticker'],
    category: 'sticker',
    description: 'Cari dan kirim sticker pack native WhatsApp',
    usage: '.stickerpack <query>',
    example: '.stickerpack anime',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 20,
    limit: 2,
    isEnabled: true
}

async function handler(m, { sock }) {
    const query = m.args?.join(' ')?.trim()
    
    if (!query) {
        return m.reply(
            `🎨 *sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
            `> Kirim sticker pack native WhatsApp!\n\n` +
            `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
            `┃ ${m.prefix}stickerpack <query>\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `> ${m.prefix}stickerpack anime\n` +
            `> ${m.prefix}stickerpack bear\n` +
            `> ${m.prefix}stickerpack cat`
        )
    }
    
    await m.react('⏳')
    
    try {
        const apikey = config.APIkey?.neoxr
        if (!apikey) {
            await m.react('❌')
            return m.reply(`❌ API Key Neoxr tidak ditemukan di config!`)
        }
        
        const searchUrl = `https://api.neoxr.eu/api/sticker?q=${encodeURIComponent(query)}&apikey=${apikey}`
        const searchRes = await axios.get(searchUrl, { timeout: 30000 })
        
        if (!searchRes.data?.status || !searchRes.data?.data?.length) {
            await m.react('❌')
            return m.reply(`❌ Tidak ada sticker pack ditemukan untuk: *${query}*`)
        }
        
        const packs = searchRes.data.data
        const randomPack = packs[Math.floor(Math.random() * packs.length)]
        
        await m.reply(
            `🎨 *sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ ꜰᴏᴜɴᴅ*\n\n` +
            `╭┈┈⬡「 📦 *ɪɴꜰᴏ ᴘᴀᴄᴋ* 」\n` +
            `┃ 📝 *Nama:* ${randomPack.name}\n` +
            `┃ 👤 *Creator:* ${randomPack.creator}\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> ⏳ Mengambil & bundle sticker...`
        )
        
        const getUrl = `https://api.neoxr.eu/api/sticker-get?url=${encodeURIComponent(randomPack.url)}&apikey=${apikey}`
        const getRes = await axios.get(getUrl, { timeout: 60000 })
        
        if (!getRes.data?.status || !getRes.data?.data?.length) {
            await m.react('❌')
            return m.reply(`❌ Gagal mengambil sticker dari pack ini!`)
        }
        
        const stickerUrls = getRes.data.data.map(s => s.url)
        const maxStickers = Math.min(stickerUrls.length, 15)
        const selectedStickers = stickerUrls.slice(0, maxStickers)
        
        await m.reply(`📤 Mengirim *${selectedStickers.length}* sticker...`)
        
        await sendIndividual(sock, m, selectedStickers, randomPack)
        
    } catch (error) {
        console.error('[StickerPack] Error:', error.message)
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

async function sendIndividual(sock, m, stickers, packInfo) {
    const packname = packInfo.name || config.sticker?.packname || config.bot?.name || 'Ourin-AI'
    const author = packInfo.creator || config.sticker?.author || 'Bot'
    const axios = require('axios')
    
    let sent = 0
    for (let i = 0; i < Math.min(stickers.length, 6); i++) {
        try {
            const stickerUrl = stickers[i]
            const isGif = stickerUrl.includes('.gif')
            const response = await axios.get(stickerUrl, { 
                responseType: 'arraybuffer', 
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })
            const buffer = Buffer.from(response.data)
            
            if (isGif) {
                await sock.sendVideoAsSticker(m.chat, buffer, m, { packname, author })
            } else {
                await sock.sendImageAsSticker(m.chat, buffer, m, { packname, author })
            }
            sent++
            await new Promise(r => setTimeout(r, 1200))
        } catch (e) {}
    }
    
    if (sent > 0) {
        await m.react('✅')
    } else {
        await m.react('❌')
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
