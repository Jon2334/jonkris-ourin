const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')

const pluginConfig = {
    name: 'limit',
    alias: ['ceklimit', 'mylimit'],
    category: 'user',
    description: 'Cek limit user',
    usage: '.limit [@user]',
    example: '.limit',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    limit: 0,
    isEnabled: true
}

function formatNumber(num) {
    if (num === -1) return '∞ Unlimited'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    let targetJid = m.sender
    let targetName = m.pushName || 'Kamu'
    
    if (m.quoted) {
        targetJid = m.quoted.sender
        targetName = m.quoted.pushName || targetJid.split('@')[0]
    } else if (m.mentionedJid?.length) {
        targetJid = m.mentionedJid[0]
        targetName = targetJid.split('@')[0]
    }
    
    const user = db.getUser(targetJid) || db.setUser(targetJid)
    const isUnlimited = user.limit === -1
    const limitDisplay = formatNumber(user.limit)
    
    const isSelf = targetJid === m.sender
    
    let text = `╭━━━━━━━━━━━━━━━━━╮\n`
    text += `┃  📊 *ʟɪᴍɪᴛ ɪɴꜰᴏ*\n`
    text += `╰━━━━━━━━━━━━━━━━━╯\n\n`
    
    text += `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n`
    text += `┃ 👤 ᴜsᴇʀ: *${targetName}*\n`
    text += `┃ 📊 ʟɪᴍɪᴛ: *${limitDisplay}*\n`
    text += `┃ 💎 sᴛᴀᴛᴜs: *${user.isPremium ? 'Premium' : 'Free'}*\n`
    text += `╰┈┈┈┈┈┈┈┈⬡\n\n`
    
    if (isSelf && !isUnlimited && user.limit < 10) {
        text += `> ⚠️ Limit hampir habis!\n`
        text += `> Gunakan \`.buylimit\` untuk beli`
    } else if (isUnlimited) {
        text += `> ✨ Limit unlimited aktif!`
    }
    
    await m.reply(text)
}

module.exports = {
    config: pluginConfig,
    handler
}
