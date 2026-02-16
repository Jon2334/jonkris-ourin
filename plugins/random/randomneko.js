const pluginConfig = {
    name: 'randomneko',
    alias: ['neko'],
    category: 'random',
    description: 'Random gambar neko',
    usage: '.randomneko',
    example: '.randomneko',
    isOwner: false,
    isPremium: true,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    m.react('🐱')
    
    try {
        const apiUrl = 'https://api.siputzx.my.id/api/r/neko'
        
        await sock.sendMessage(m.chat, {
            image: { url: apiUrl },
            caption: `🐱 *ʀᴀɴᴅᴏᴍ ɴᴇᴋᴏ*`
        }, { quoted: m })
        
        m.react('✅')
        
    } catch (err) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${err.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
