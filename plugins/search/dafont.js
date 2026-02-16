const axios = require('axios')

const pluginConfig = {
    name: 'dafont',
    alias: ['font', 'fontsearch'],
    category: 'search',
    description: 'Cari font di DaFont',
    usage: '.dafont <query>',
    example: '.dafont Coolvetica',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

function formatNumber(num) {
    const n = parseInt(num)
    if (isNaN(n)) return num
    if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B'
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
    return n.toString()
}

async function handler(m, { sock }) {
    const query = m.text?.trim()
    
    if (!query) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}dafont <query>\`\n\n` +
            `> Contoh:\n` +
            `> \`${m.prefix}dafont Coolvetica\``
        )
    }
    
    try {
        const res = await axios.get(`https://api.nekolabs.web.id/dsc/dafont/search?q=${encodeURIComponent(query)}`)
        
        if (!res.data?.success || !res.data?.result?.length) {
            return m.reply(`❌ Tidak ditemukan font untuk: ${query}`)
        }
        
        const fonts = res.data.result.slice(0, 5)
        
        let txt = `🔤 *ᴅᴀꜰᴏɴᴛ sᴇᴀʀᴄʜ*\n\n`
        txt += `> Query: *${query}*\n`
        txt += `━━━━━━━━━━━━━━━\n\n`
        
        fonts.forEach((f, i) => {
            txt += `╭─「 🅰️ *${i + 1}* 」\n`
            txt += `┃ 📛 \`\`\`${f.title}\`\`\`\n`
            txt += `┃ 👤 \`${f.author?.name || 'Unknown'}\`\n`
            txt += `┃ 🏷️ \`${f.theme || '-'}\`\n`
            txt += `┃ 📥 \`${formatNumber(f.totalDownloads)} downloads\`\n`
            txt += `┃ 🔗 \`${f.url}\`\n`
            txt += `╰━━━━━━━━━━━━━━\n\n`
        })
        
        return m.reply(txt.trim())
        
    } catch (err) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> ${err.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
