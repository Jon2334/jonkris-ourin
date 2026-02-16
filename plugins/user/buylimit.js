const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'buylimit',
    alias: ['belilimit', 'purchaselimit'],
    category: 'user',
    description: 'Beli limit dengan balance (1 limit = 100 balance)',
    usage: '.buylimit <jumlah>',
    example: '.buylimit 10',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

const PRICE_PER_LIMIT = 100

function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const amount = parseInt(m.args[0]) || 0
    
    if (amount <= 0) {
        const user = db.getUser(m.sender) || db.setUser(m.sender)
        
        return m.reply(
            `🛒 *ʙᴜʏ ʟɪᴍɪᴛ*\n\n` +
            `╭┈┈⬡「 💰 *ɪɴꜰᴏ* 」\n` +
            `┃ 💵 ʜᴀʀɢᴀ: *${PRICE_PER_LIMIT}* bal/limit\n` +
            `┃ 💰 ʙᴀʟᴀɴᴄᴇ ᴋᴀᴍᴜ: *${formatNumber(user.balance || 0)}*\n` +
            `╰┈┈⬡\n\n` +
            `> Gunakan: \`.buylimit <jumlah>\`\n\n` +
            `\`Contoh: ${m.prefix}buylimit 10\``
        )
    }
    
    const totalPrice = amount * PRICE_PER_LIMIT
    const user = db.getUser(m.sender) || db.setUser(m.sender)
    
    if ((user.balance || 0) < totalPrice) {
        return m.reply(
            `❌ *ɢᴀɢᴀʟ*\n\n` +
            `> Balance tidak cukup!\n` +
            `> Butuh: *${formatNumber(totalPrice)}*\n` +
            `> Kamu punya: *${formatNumber(user.balance || 0)}*`
        )
    }
    
    db.updateBalance(m.sender, -totalPrice)
    
    if (user.limit === -1) {
        m.react('✅')
        return m.reply(
            `✅ *ᴘᴇᴍʙᴇʟɪᴀɴ ʙᴇʀʜᴀsɪʟ*\n\n` +
            `> Tapi kamu sudah punya unlimited limit!\n` +
            `> Balance dikembalikan.`
        )
    }
    
    const newLimit = db.updateLimit(m.sender, amount)
    const newBalance = db.getUser(m.sender).balance
    
    m.react('✅')
    
    await m.reply(
        `✅ *ᴘᴇᴍʙᴇʟɪᴀɴ ʙᴇʀʜᴀsɪʟ*\n\n` +
        `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
        `┃ 📊 ʟɪᴍɪᴛ: *+${formatNumber(amount)}*\n` +
        `┃ 💵 ʜᴀʀɢᴀ: *-${formatNumber(totalPrice)}* bal\n` +
        `╰┈┈⬡\n\n` +
        `╭┈┈⬡「 💰 *sᴀʟᴅᴏ* 」\n` +
        `┃ 📊 ʟɪᴍɪᴛ: *${formatNumber(newLimit)}*\n` +
        `┃ 💰 ʙᴀʟᴀɴᴄᴇ: *${formatNumber(newBalance)}*\n` +
        `╰┈┈⬡`
    )
}

module.exports = {
    config: pluginConfig,
    handler
}
