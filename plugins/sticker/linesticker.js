const axios = require('axios')
const config = require('../../config')

const pluginConfig = {
    name: 'linesticker',
    alias: ['linepack', 'line'],
    category: 'sticker',
    description: 'Download sticker pack LINE sebagai native WhatsApp pack',
    usage: '.linesticker <url>',
    example: '.linesticker https://store.line.me/stickershop/product/9801/en',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 25,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.args?.[0]?.trim()
    
    if (!url || !url.includes('store.line.me')) {
        return m.reply(
            `🎨 *ʟɪɴᴇ sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
            `> Download LINE sticker sebagai native WhatsApp pack\n\n` +
            `╭┈┈⬡「 📋 *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ* 」\n` +
            `┃ ${m.prefix}linesticker <url>\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `*ᴄᴀʀᴀ ᴅᴀᴘᴀᴛ ᴜʀʟ:*\n` +
            `> 1. Buka https://store.line.me\n` +
            `> 2. Pilih sticker pack\n` +
            `> 3. Copy URL dari browser\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `> ${m.prefix}linesticker https://store.line.me/stickershop/product/9801/en`
        )
    }
    
    await m.react('⏳')
    
    try {
        const apikey = config.APIkey?.neoxr
        if (!apikey) {
            await m.react('❌')
            return m.reply(`❌ API Key Neoxr tidak ditemukan di config!`)
        }
        
        const apiUrl = `https://api.neoxr.eu/api/linesticker?url=${encodeURIComponent(url)}&apikey=${apikey}`
        const res = await axios.get(apiUrl, { timeout: 60000 })
        
        if (!res.data?.status || !res.data?.data) {
            await m.react('❌')
            return m.reply(`❌ Gagal mengambil sticker dari URL tersebut!`)
        }
        
        const data = res.data.data
        const title = data.title || 'LINE Sticker'
        const author = data.author || 'Unknown'
        const isAnimated = data.animated || false
        
        const stickerUrls = isAnimated && data.sticker_animation_url?.length
            ? data.sticker_animation_url
            : data.sticker_url || []
        
        if (!stickerUrls.length) {
            await m.react('❌')
            return m.reply(`❌ Tidak ada sticker ditemukan!`)
        }
        
        await m.reply(
            `🎨 *ʟɪɴᴇ sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ*\n\n` +
            `╭┈┈⬡「 📦 *ɪɴꜰᴏ* 」\n` +
            `┃ 📝 *Title:* ${title}\n` +
            `┃ 👤 *Author:* ${author}\n` +
            `┃ 🎬 *Animated:* ${isAnimated ? 'Ya' : 'Tidak'}\n` +
            `┃ 📊 *Total:* ${stickerUrls.length}\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> ⏳ Membuat sticker pack...`
        )
        
        const maxStickers = Math.min(stickerUrls.length, 20)
        const selectedStickers = stickerUrls.slice(0, maxStickers)
        
        await sendIndividual(sock, m, selectedStickers, { name: title, creator: author }, isAnimated)
        
        if (stickerUrls.length > maxStickers) {
            await m.reply(`> ℹ️ Pack berisi ${maxStickers} dari ${stickerUrls.length} sticker`)
        }
        
    } catch (error) {
        console.error('[LineSticker] Error:', error.message)
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

async function sendIndividual(sock, m, stickers, packInfo, isAnimated) {
    const packname = packInfo.name || config.sticker?.packname || config.bot?.name || 'Ourin-AI'
    const author = packInfo.creator || config.sticker?.author || 'LINE'
    const axios = require('axios')
    
    let sent = 0
    for (let i = 0; i < Math.min(stickers.length, 8); i++) {
        try {
            const response = await axios.get(stickers[i], { 
                responseType: 'arraybuffer', 
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            })
            const buffer = Buffer.from(response.data)
            
            if (isAnimated) {
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
