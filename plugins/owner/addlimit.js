const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'addlimit',
    alias: ['tambahlimit', 'givelimit'],
    category: 'owner',
    description: 'Tambah limit user',
    usage: '.addlimit <jumlah> @user',
    example: '.addlimit 100 @user',
    isOwner: true,
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

function extractTarget(m) {
    if (m.quoted) return m.quoted.sender
    if (m.mentionedJid?.length) return m.mentionedJid[0]
    return null
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args
    
    let amount = 0
    let isUnlimited = false
    
    if (args.includes('--unlimited') || args.includes('--unli')) {
        isUnlimited = true
    } else {
        const numArg = args.find(a => !isNaN(a) && !a.startsWith('@'))
        amount = parseInt(numArg) || 0
    }
    
    let targetJid = extractTarget(m)
    
    if (!targetJid && (amount > 0 || isUnlimited)) {
        targetJid = m.sender
    }
    
    if (!targetJid || (!isUnlimited && amount <= 0)) {
        return m.reply(
            `📊 *ᴀᴅᴅ ʟɪᴍɪᴛ*\n\n` +
            `> \`.addlimit <jumlah>\` - ke diri sendiri\n` +
            `> \`.addlimit <jumlah> @user\` - ke user\n` +
            `> \`.addlimit --unlimited\` - unlimited\n\n` +
            `\`Contoh: ${m.prefix}addlimit 100\``
        )
    }
    
    if (!isUnlimited && amount <= 0) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Jumlah limit harus lebih dari 0`)
    }
    
    const user = db.getUser(targetJid) || db.setUser(targetJid)
    const oldLimit = user.limit
    
    if (isUnlimited) {
        db.setUser(targetJid, { limit: -1 })
        
        m.react('✅')
        await m.reply(
            `✅ *ʟɪᴍɪᴛ ᴜɴʟɪᴍɪᴛᴇᴅ*\n\n` +
            `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
            `┃ 👤 ᴜsᴇʀ: @${targetJid.split('@')[0]}\n` +
            `┃ 📊 ʟɪᴍɪᴛ: *∞ Unlimited*\n` +
            `╰┈┈⬡`,
            { mentions: [targetJid] }
        )
    } else {
        const newLimit = db.updateLimit(targetJid, amount)
        
        m.react('✅')
        await m.reply(
            `✅ *ʟɪᴍɪᴛ ᴅɪᴛᴀᴍʙᴀʜ*\n\n` +
            `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
            `┃ 👤 ᴜsᴇʀ: @${targetJid.split('@')[0]}\n` +
            `┃ ➕ ᴛᴀᴍʙᴀʜ: *+${formatNumber(amount)}*\n` +
            `┃ 📊 ᴛᴏᴛᴀʟ: *${formatNumber(newLimit)}*\n` +
            `╰┈┈⬡`,
            { mentions: [targetJid] }
        )
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
