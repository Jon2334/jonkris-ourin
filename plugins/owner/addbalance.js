const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'addbalance',
    alias: ['tambahbalance', 'givebalance', 'addbal', 'addmoney'],
    category: 'owner',
    description: 'Tambah balance user (max 9 Triliun)',
    usage: '.addbalance <jumlah> @user',
    example: '.addbalance 100000 @user',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    limit: 0,
    isEnabled: true
}

const MAX_BALANCE = 9000000000000

function formatBalance(num) {
    if (num >= 1000000000000) return (num / 1000000000000).toFixed(2) + 'T'
    if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
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
    
    const numArg = args.find(a => !isNaN(a) && !a.startsWith('@'))
    let amount = parseInt(numArg) || 0
    
    let targetJid = extractTarget(m)
    
    if (!targetJid && amount > 0) {
        targetJid = m.sender
    }
    
    if (!targetJid || amount <= 0) {
        return m.reply(
            `💰 *ᴀᴅᴅ ʙᴀʟᴀɴᴄᴇ*\n\n` +
            `> \`.addbalance <jumlah>\` - ke diri sendiri\n` +
            `> \`.addbalance <jumlah> @user\` - ke orang lain\n` +
            `> Max: 9.000.000.000.000 (9T)\n\n` +
            `\`Contoh: ${m.prefix}addbalance 100000\``
        )
    }
    
    if (amount <= 0) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Jumlah balance harus lebih dari 0`)
    }
    
    if (amount > MAX_BALANCE) {
        amount = MAX_BALANCE
    }
    
    const newBalance = db.updateBalance(targetJid, amount)
    
    m.react('✅')
    
    await m.reply(
        `✅ *ʙᴀʟᴀɴᴄᴇ ᴅɪᴛᴀᴍʙᴀʜ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ 👤 ᴜsᴇʀ: @${targetJid.split('@')[0]}\n` +
        `┃ ➕ ᴛᴀᴍʙᴀʜ: *+${formatBalance(amount)}*\n` +
        `┃ 💰 ᴛᴏᴛᴀʟ: *${formatBalance(newBalance)}*\n` +
        `╰┈┈⬡`,
        { mentions: [targetJid] }
    )
}

module.exports = {
    config: pluginConfig,
    handler
}
