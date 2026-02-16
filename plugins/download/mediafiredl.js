const { mediafire } = require('btch-downloader')

const pluginConfig = {
    name: 'mediafiredl',
    alias: ['mfdl', 'mediafire', 'mf'],
    category: 'download',
    description: 'Download file dari MediaFire',
    usage: '.mfdl <url>',
    example: '.mfdl https://www.mediafire.com/file/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 15,
    limit: 1,
    isEnabled: true
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}mfdl <url>\`\n\n` +
            `> Contoh:\n` +
            `> \`${m.prefix}mfdl https://www.mediafire.com/file/xxx\``
        )
    }
    
    if (!url.match(/mediafire\.com/i)) {
        return m.reply(`❌ URL tidak valid. Gunakan link MediaFire.`)
    }
    
    await m.reply(`⏳ *ᴍᴇɴɢᴀᴍʙɪʟ ɪɴꜰᴏ ꜰɪʟᴇ...*`)
    
    try {
        const data = await mediafire(url)
        
        if (!data?.status || !data?.result?.url) {
            return m.reply(`❌ Gagal mengambil file. Coba link lain.`)
        }
        
        const result = data.result
        
        let txt = `📁 *ᴍᴇᴅɪᴀꜰɪʀᴇ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n`
        txt += `╭─「 📋 *ɪɴꜰᴏ ꜰɪʟᴇ* 」\n`
        txt += `┃ 📛 \`ɴᴀᴍᴀ\`: *${result.filename}*\n`
        txt += `┃ 📦 \`ᴜᴋᴜʀᴀɴ\`: *${result.filesize}*\n`
        txt += `┃ 📝 \`ᴛɪᴘᴇ\`: *${result.ext}*\n`
        txt += `╰───────────────\n\n`
        txt += `> ⏳ Mengirim file...`
        
        await m.reply(txt)
        
        await sock.sendMessage(m.chat, {
            document: { url: result.url },
            mimetype: result.mimetype || 'application/octet-stream',
            fileName: result.filename
        }, { quoted: m })
        
    } catch (err) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> ${err.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
