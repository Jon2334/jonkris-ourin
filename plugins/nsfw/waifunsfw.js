const axios = require('axios')
const config = require('../../config')

const WAIFUIM_TYPES = [
    'ass', 'ecchi', 'ero', 'hentai', 'maid', 'milf', 
    'oppai', 'oral', 'paizuri', 'selfies', 'uniform', 'waifu'
]

const allCommands = WAIFUIM_TYPES.map(t => `waifu-${t}`)

const pluginConfig = {
    name: allCommands,
    alias: [],
    category: 'nsfw',
    description: 'Random Waifu NSFW image',
    usage: '.waifu-<type>',
    example: '.waifu-hentai',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 2,
    isEnabled: true
}

function parseType(command) {
    const match = command.match(/^waifu-(.+)$/i)
    if (!match) return null
    const type = match[1].toLowerCase()
    return WAIFUIM_TYPES.includes(type) ? type : null
}

async function handler(m, { sock }) {
    const type = parseType(m.command)
    
    if (!type) {
        return m.reply(
            `🔞 *ᴡᴀɪꜰᴜ ɴsꜰᴡ*\n\n` +
            `> Type tidak valid\n\n` +
            `*Available types:*\n` +
            `${WAIFUIM_TYPES.map(t => `\`${m.prefix}waifu-${t}\``).join('\n')}`
        )
    }
    
    m.react('🔞')
    
    try {
        const res = await axios.get(`https://api.nekolabs.web.id/random/waifuim?type=${type}`, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        await sock.sendMessage(m.chat, {
            image: Buffer.from(res.data),
            caption: `🔞 *ᴡᴀɪꜰᴜ ɴsꜰᴡ*\n\n> Type: \`${type}\`\n\n_Ketik \`${m.prefix}waifu-${type}\` untuk gambar lainnya_`,
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
        
        m.react('✅')
        
    } catch (err) {
         return m.reply(`🍀 *NOTE*
- Umm, kayaknya lagi ada perbaikan dari API sana nya, coba lagi beberapa saat`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
