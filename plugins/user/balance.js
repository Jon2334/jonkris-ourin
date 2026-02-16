const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'balance',
    alias: ['bal', 'saldo', 'money', 'cash'],
    category: 'user',
    description: 'Cek balance user',
    usage: '.balance [@user]',
    example: '.balance',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    limit: 0,
    isEnabled: true
}

function formatBalance(num) {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
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
    const balanceDisplay = formatBalance(user.balance || 0)
    
    const isSelf = targetJid === m.sender
    
    let text = `╭━━━━━━━━━━━━━━━━━╮\n`
    text += `┃  💰 *ʙᴀʟᴀɴᴄᴇ ɪɴꜰᴏ*\n`
    text += `╰━━━━━━━━━━━━━━━━━╯\n\n`
    
    text += `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n`
    text += `┃ 👤 ᴜsᴇʀ: *${targetName}*\n`
    text += `┃ 💰 ʙᴀʟᴀɴᴄᴇ: *${balanceDisplay}*\n`
    text += `┃ 💎 sᴛᴀᴛᴜs: *${user.isPremium ? 'Premium' : 'Free'}*\n`
    text += `╰┈┈┈┈┈┈┈┈⬡\n\n`
    
    if (isSelf) {
        text += `╭┈┈⬡「 🛒 *sʜᴏᴘ* 」\n`
        text += `┃ ◦ \`.buylimit <jml>\` - 1 = 100 bal\n`
        text += `┃ ◦ \`.buyfitur\` - 1 = 3000 bal\n`
        text += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        text += `> Main game untuk dapat balance! 🎮`
    }
    
    await m.reply(text)
}

module.exports = {
    config: pluginConfig,
    handler
}
