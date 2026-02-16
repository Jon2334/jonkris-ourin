const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'dellimit',
    alias: ['kuranglimit', 'removelimit', 'hapuslimit'],
    category: 'owner',
    description: 'Kurangi limit user',
    usage: '.dellimit <jumlah> @user',
    example: '.dellimit 50 @user',
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
    
    const numArg = args.find(a => !isNaN(a) && !a.startsWith('@'))
    const amount = parseInt(numArg) || 0
    
    let targetJid = extractTarget(m)
    
    if (!targetJid && amount > 0) {
        targetJid = m.sender
    }
    
    if (!targetJid || amount <= 0) {
        return m.reply(
            `📊 *ᴅᴇʟ ʟɪᴍɪᴛ*\n\n` +
            `> \`.dellimit <jumlah>\` - dari diri sendiri\n` +
            `> \`.dellimit <jumlah> @user\` - dari user\n\n` +
            `\`Contoh: ${m.prefix}dellimit 50\``
        )
    }
    
    if (amount <= 0) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Jumlah harus lebih dari 0`)
    }
    
    const user = db.getUser(targetJid)
    
    if (!user) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> User tidak ditemukan di database`)
    }
    
    if (user.limit === -1) {
        db.setUser(targetJid, { limit: 25 })
    }
    
    const newLimit = db.updateLimit(targetJid, -amount)
    
    m.react('✅')
    
    await m.reply(
        `✅ *ʟɪᴍɪᴛ ᴅɪᴋᴜʀᴀɴɢɪ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ 👤 ᴜsᴇʀ: @${targetJid.split('@')[0]}\n` +
        `┃ ➖ ᴋᴜʀᴀɴɢ: *-${formatNumber(amount)}*\n` +
        `┃ 📊 sɪsᴀ: *${formatNumber(newLimit)}*\n` +
        `╰┈┈⬡`,
        { mentions: [targetJid] }
    )
}

module.exports = {
    config: pluginConfig,
    handler
}
