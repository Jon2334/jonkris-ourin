const axios = require('axios')
const config = require('../../config')
const path = require('path')
const fs = require('fs')

const pluginConfig = {
    name: 'ourinanime',
    alias: ['animagine', 'ourin-anime', 'xl-anime'],
    category: 'ai',
    description: 'Generate anime dengan Animagine XL 4.0',
    usage: '.ourinanime <karakter>',
    example: '.ourinanime Shiroko',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    limit: 3,
    isEnabled: true
}

let thumbAnime = null
try {
    const p = path.join(process.cwd(), 'assets/images/ourin-ai.jpg')
    if (fs.existsSync(p)) thumbAnime = fs.readFileSync(p)
} catch {}

function getContextInfo(title, body, thumbnail) {
    const saluranId = config.saluran?.id || '120363175366250567@newsletterp'
    const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'

    const ctx = {
        forwardingScore: 9999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127
        }
    }

    const thumb = thumbnail || thumbAnime
    if (thumb) {
        ctx.externalAdReply = {
            title,
            body,
            thumbnail: thumb,
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: config.saluran?.link || ''
        }
    }

    return ctx
}

const VALID_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '21:9', '9:21']

async function handler(m, { sock }) {
    const args = m.text?.trim().split(/\s+/) || []
    
    let prompt = ''
    let ratio = '1:1'
    
    for (const arg of args) {
        if (VALID_RATIOS.includes(arg)) {
            ratio = arg
        } else {
            prompt += (prompt ? ' ' : '') + arg
        }
    }
    
    if (!prompt) {
        return m.reply(
            `🌸 *ᴏᴜʀɪɴ ᴀɴɪᴍᴇ ɢᴇɴᴇʀᴀᴛᴏʀ*\n\n` +
            `> Generate anime dengan *Animagine XL 4.0*!\n\n` +
            `*ᴄᴀʀᴀ ᴘᴀᴋᴀɪ:*\n` +
            `> \`${m.prefix}ourinanime <prompt> [ratio]\`\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `> \`${m.prefix}ourinanime Shiroko\`\n` +
            `> \`${m.prefix}ourinanime Raiden Shogun 16:9\`\n` +
            `> \`${m.prefix}ourinanime cute girl, pink hair 9:16\`\n\n` +
            `*ʀᴀᴛɪᴏ:*\n` +
            `> ${VALID_RATIOS.join(', ')}\n\n` +
            `*ᴛɪᴘs:*\n` +
            `> • Gunakan nama karakter anime populer\n` +
            `> • Tambahkan detail: warna rambut, pose, dll\n` +
            `> • Default ratio: 1:1 (square)`
        )
    }
    
    m.react('🌸')
    await m.reply(
        `⏳ *ɢᴇɴᴇʀᴀᴛɪɴɢ...*\n\n` +
        `> 🎭 Prompt: _${prompt.substring(0, 80)}${prompt.length > 80 ? '...' : ''}_\n` +
        `> 📐 Ratio: *${ratio}*\n\n` +
        `> Menggunakan *Animagine XL 4.0*`
    )
    
    try {
        const encodedPrompt = encodeURIComponent(prompt)
        const encodedRatio = encodeURIComponent(ratio)
        const apiUrl = `https://api.nekolabs.web.id/image.gen/animagine/xl-4.0?prompt=${encodedPrompt}&ratio=${encodedRatio}`
        
        const { data } = await axios.get(apiUrl, { timeout: 180000 })
        
        if (!data?.success || !data?.result) {
            m.react('❌')
            return m.reply('❌ *ɢᴀɢᴀʟ*\n\n> Gagal generate gambar. Coba lagi nanti!')
        }
        
        let thumbBuffer = null
        try {
            const thumbRes = await axios.get(data.result, { 
                responseType: 'arraybuffer', 
                timeout: 30000 
            })
            thumbBuffer = Buffer.from(thumbRes.data)
        } catch {}
        
        const responseTime = data.responseTime || 'N/A'
        
        const caption = `🌸 *ᴏᴜʀɪɴ ᴀɴɪᴍᴇ ɢᴇɴᴇʀᴀᴛᴇᴅ*\n\n` +
            `╭┈┈⬡「 🎨 *ʀᴇsᴜʟᴛ* 」\n` +
            `┃ 🎭 *Prompt:*\n` +
            `┃ _${prompt}_\n` +
            `┃\n` +
            `┃ 📐 *Ratio:* ${ratio}\n` +
            `┃ ⏱️ *Gen Time:* ${responseTime}\n` +
            `┃ 🤖 *Model:* Animagine XL 4.0\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> ${config.bot?.name || 'Ourin-AI'}`
        
        await sock.sendMessage(m.chat, {
            image: { url: data.result },
            caption,
            contextInfo: getContextInfo('🌸 OURIN ANIME', prompt, thumbBuffer)
        }, { quoted: m })
        
        m.react('✅')
        
    } catch (error) {
        m.react('❌')
        if (error.code === 'ECONNABORTED') {
            m.reply('⏱️ *ᴛɪᴍᴇᴏᴜᴛ*\n\n> Request terlalu lama (batas 3 menit). Coba lagi!')
        } else {
            m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
        }
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
