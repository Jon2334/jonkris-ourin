const pluginConfig = {
    name: ['carbon', 'carbonify', 'carboncode'],
    alias: [],
    category: 'tools',
    description: 'Membuat gambar kode dengan tampilan carbon style',
    usage: '.carbon <kode>',
    example: '.carbon console.log("Hello World")',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 1,
    isEnabled: true
}

async function handler(m) {
    const text = m.text || m.quoted?.text
    
    if (!text) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}carbon <kode>\`\n` +
            `> Atau reply pesan berisi kode\n\n` +
            `> Contoh: \`${m.prefix}carbon console.log("Hello")\``
        )
    }
    
    await m.reply(`⏳ *Membuat carbon image...*`)
    
    try {
        const title = m.pushName || 'Code'
        const apiUrl = `https://api.zenzxz.my.id/api/maker/carbonify?input=${encodeURIComponent(text)}&title=${encodeURIComponent(title)}`
        
        await m.sock.sendMessage(m.chat, {
            image: { url: apiUrl },
            caption: `🖥️ *Carbon Code*\n> By: ${m.pushName}`
        }, { quoted: m })
        
        m.react('🖥️')
        
    } catch (err) {
        m.react('❌')
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> ${err.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
