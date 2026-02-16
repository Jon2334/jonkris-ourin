const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'delbalance',
    alias: ['kurangbalance', 'removebalance', 'delbal', 'delmoney'],
    category: 'owner',
    description: 'Kurangi balance user',
    usage: '.delbalance <jumlah> @user',
    example: '.delbalance 50000 @user',
    isOwner: true,
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

function extractTarget(m) {
    if (m.quoted) return m.quoted.sender
    if (m.mentionedJid?.length) return m.mentionedJid[0]
    return null
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const args = m.args
    
    const numArg = args.find(a => !isNaN(a) && !a.startsWith('@'))
    const amount = parseInt(numArg) || 0
    
    let targetJid = extractTarget(m)
    
    if (!targetJid && amount > 0) {
        targetJid = m.sender
    }
    
    if (!targetJid || amount <= 0) {
        return m.reply(
            `💰 *ᴅᴇʟ ʙᴀʟᴀɴᴄᴇ*\n\n` +
            `> \`.delbalance <jumlah>\` - dari diri sendiri\n` +
            `> \`.delbalance <jumlah> @user\` - dari user\n\n` +
            `\`Contoh: ${m.prefix}delbalance 50000\``
        )
    }
    
    if (amount <= 0) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Jumlah harus lebih dari 0`)
    }
    
    const user = db.getUser(targetJid)
    
    if (!user) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> User tidak ditemukan di database`)
    }
    
    const newBalance = db.updateBalance(targetJid, -amount)
    
    m.react('✅')
    
    await m.reply(
        `✅ *ʙᴀʟᴀɴᴄᴇ ᴅɪᴋᴜʀᴀɴɢɪ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ 👤 ᴜsᴇʀ: @${targetJid.split('@')[0]}\n` +
        `┃ ➖ ᴋᴜʀᴀɴɢ: *-${formatBalance(amount)}*\n` +
        `┃ 💰 sɪsᴀ: *${formatBalance(newBalance)}*\n` +
        `╰┈┈⬡`,
        { mentions: [targetJid] }
    )
}

module.exports = {
    config: pluginConfig,
    handler
}
