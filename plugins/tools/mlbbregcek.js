const axios = require('axios')
const config = require('../../config')

const pluginConfig = {
    name: 'mlbbregcek',
    alias: ['mlregion', 'cekmlbb', 'mlbbcheck', 'cekml'],
    category: 'tools',
    description: 'Cek username dan region akun Mobile Legends',
    usage: '.mlbbregcek <user_id> <zone_id>',
    example: '.mlbbregcek 123456789 1234',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 1,
    isEnabled: true
}

async function checkMLRegion(userId, zoneId) {
    const { data } = await axios.post('https://api.nekolabs.web.id/px?url=https://api-gw-prd.vocagame.com/gateway-ms/order/v1/client/transactions/verify', {
        shop_code: 'MOBILE_LEGENDS',
        data: {
            user_id: userId.toString(),
            zone_id: zoneId.toString()
        }
    }, {
        headers: {
            origin: 'https://vocagame.com',
            referer: 'https://vocagame.com/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36',
            'x-api-key': '4QG09jBHxuS4',
            'x-client': 'web-mobile',
            'x-country': 'ID',
            'x-locale': 'id-id',
            'x-timestamp': Date.now()
        }
    })
    
    return data.result.content
}

async function handler(m, { sock }) {
    const args = m.text?.trim()?.split(/\s+/)
    
    if (!args || args.length < 2) {
        return m.reply(
            `🎮 *ᴍʟʙʙ ʀᴇɢɪᴏɴ ᴄʜᴇᴄᴋ*\n\n` +
            `> Cek username dan region akun MLBB\n\n` +
            `> *Cara Pakai:*\n` +
            `> ${m.prefix}mlbbregcek <user_id> <zone_id>\n\n` +
            `> *Contoh:*\n` +
            `> ${m.prefix}mlbbregcek 123456789 1234`
        )
    }
    
    const userId = args[0]
    const zoneId = args[1]
    
    if (isNaN(userId)) {
        return m.reply(`❌ User ID harus berupa angka!`)
    }
    
    if (isNaN(zoneId)) {
        return m.reply(`❌ Zone ID harus berupa angka!`)
    }
    
    await m.react('⏳')
    
    try {
        const result = await checkMLRegion(userId, zoneId)
        
        if (!result || result.code !== 200) {
            await m.react('❌')
            return m.reply(`❌ Akun tidak ditemukan atau ID tidak valid!`)
        }
        
        const username = result.data?.username || 'Unknown'
        const region = result.data?.country_of_origin?.toUpperCase() || 'Unknown'
        
        const regionNames = {
            'ID': '🇮🇩 Indonesia',
            'MY': '🇲🇾 Malaysia',
            'PH': '🇵🇭 Philippines',
            'SG': '🇸🇬 Singapore',
            'TH': '🇹🇭 Thailand',
            'VN': '🇻🇳 Vietnam',
            'MM': '🇲🇲 Myanmar',
            'KH': '🇰🇭 Cambodia',
            'TW': '🇹🇼 Taiwan',
            'JP': '🇯🇵 Japan',
            'KR': '🇰🇷 Korea',
            'IN': '🇮🇳 India',
            'BR': '🇧🇷 Brazil',
            'RU': '🇷🇺 Russia',
            'US': '🇺🇸 United States'
        }
        
        const regionDisplay = regionNames[region] || `🌐 ${region}`
        
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        let text = `🎮 *ᴍʟʙʙ ᴀᴄᴄᴏᴜɴᴛ ɪɴꜰᴏ*\n\n`
        text += `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n`
        text += `┃ 👤 Username: *${username}*\n`
        text += `┃ 🆔 User ID: *${userId}*\n`
        text += `┃ 🔢 Zone ID: *${zoneId}*\n`
        text += `┃ 🌍 Region: *${regionDisplay}*\n`
        text += `╰┈┈┈┈┈┈┈┈⬡`
        
        await sock.sendMessage(m.chat, {
            text,
            contextInfo: {
                forwardingScore: 9999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: saluranId,
                    newsletterName: saluranName,
                    serverMessageId: 127
                }
            }
        }, { quoted: m })
        
        await m.react('✅')
        
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
