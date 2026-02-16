const axios = require('axios')
const config = require('../../config')

const NSFWHUB_TYPES = [
    'ass', 'sixtynine', 'pussy', 'dick', 'anal', 'boobs', 'bdsm', 'black',
    'easter', 'bottomless', 'blowjub', 'collared', 'cum', 'cumsluts', 'dp',
    'dom', 'extreme', 'feet', 'finger', 'fuck'
]

const allCommands = NSFWHUB_TYPES.map(t => `nsfw-${t}`)

const pluginConfig = {
    name: allCommands,
    alias: [],
    category: 'nsfw',
    description: 'Random NSFW Hub image',
    usage: '.nsfw-<type>',
    example: '.nsfw-ass',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 2,
    isEnabled: true
}

function parseType(command) {
    const match = command.match(/^nsfw-(.+)$/i)
    if (!match) return null
    const type = match[1].toLowerCase()
    return NSFWHUB_TYPES.includes(type) ? type : null
}

async function handler(m, { sock }) {
    const type = parseType(m.command)
    
    if (!type) {
        return m.reply(
            `🔞 *ɴsꜰᴡ ʜᴜʙ*\n\n` +
            `> Type tidak valid\n\n` +
            `*Available types:*\n` +
            `${NSFWHUB_TYPES.map(t => `\`${m.prefix}nsfw-${t}\``).join('\n')}`
        )
    }
    
    m.react('🔞')
    
    try {
        const res = await axios.get(`https://api.nekolabs.web.id/random/nsfwhub?type=${type}`, {
            responseType: 'arraybuffer',
            timeout: 30000
        })
        
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        await sock.sendMessage(m.chat, {
            image: Buffer.from(res.data),
            caption: `🔞 *ɴsꜰᴡ ʜᴜʙ*\n\n> Type: \`${type}\`\n\n_Ketik \`${m.prefix}nsfw-${type}\` untuk gambar lainnya_`,
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
