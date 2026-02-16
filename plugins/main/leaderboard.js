const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')

const pluginConfig = {
    name: 'leaderboard',
    alias: ['lb', 'top', 'topbalance', 'topbal', 'toplimit', 'topexp', 'topxp', 'ranking'],
    category: 'main',
    description: 'Lihat leaderboard (balance, exp, limit)',
    usage: '.leaderboard',
    example: '.topbalance',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const cmd = m.command.toLowerCase()
    
    const users = []
    const dbData = db.db?.data?.users || {}
    
    for (const [jid, userData] of Object.entries(dbData)) {
        if (!jid || jid === 'undefined') continue
        users.push({
            jid,
            balance: userData.balance || 0,
            exp: userData.exp || 0,
            limit: userData.limit || 0,
            level: userData.level || 1,
            name: userData.name || jid.split('@')[0]
        })
    }
    
    if (users.length === 0) {
        return m.reply(`📊 *ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ*\n\n> Belum ada data user terdaftar.`)
    }
    
    let sortedUsers
    let title
    let emoji
    let field
    
    if (['topbalance', 'topbal'].includes(cmd)) {
        sortedUsers = users.sort((a, b) => b.balance - a.balance).slice(0, 10)
        title = 'TOP BALANCE'
        emoji = '💰'
        field = 'balance'
    } else if (['toplimit'].includes(cmd)) {
        sortedUsers = users.sort((a, b) => b.limit - a.limit).slice(0, 10)
        title = 'TOP LIMIT'
        emoji = '🎟️'
        field = 'limit'
    } else if (['topexp', 'topxp'].includes(cmd)) {
        sortedUsers = users.sort((a, b) => b.exp - a.exp).slice(0, 10)
        title = 'TOP EXP'
        emoji = '✨'
        field = 'exp'
    } else {
        const totalBalance = users.reduce((sum, u) => sum + u.balance, 0)
        const totalExp = users.reduce((sum, u) => sum + u.exp, 0)
        const totalLimit = users.reduce((sum, u) => sum + u.limit, 0)
        
        const maxBalUser = users.reduce((a, b) => a.balance > b.balance ? a : b)
        const maxExpUser = users.reduce((a, b) => a.exp > b.exp ? a : b)
        const maxLimUser = users.reduce((a, b) => a.limit > b.limit ? a : b)
        
        const balPct = totalBalance > 0 ? ((maxBalUser.balance / totalBalance) * 100).toFixed(1) : 0
        const expPct = totalExp > 0 ? ((maxExpUser.exp / totalExp) * 100).toFixed(1) : 0
        const limPct = totalLimit > 0 ? ((maxLimUser.limit / totalLimit) * 100).toFixed(1) : 0
        
        const mentions = [maxBalUser.jid, maxExpUser.jid, maxLimUser.jid]
        
        return sock.sendMessage(m.chat, {
            text: `🏆 *ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ ᴏᴠᴇʀᴠɪᴇᴡ*\n\n` +
                `📊 Total User: *${users.length}*\n\n` +
                `╭┈┈⬡「 💰 *ᴛᴏᴘ ʙᴀʟᴀɴᴄᴇ* 」\n` +
                `┃ 👤 @${maxBalUser.jid.split('@')[0]}\n` +
                `┃ 💵 ${formatNumber(maxBalUser.balance)} (${balPct}%)\n` +
                `╰┈┈⬡\n\n` +
                `╭┈┈⬡「 ✨ *ᴛᴏᴘ ᴇxᴘ* 」\n` +
                `┃ 👤 @${maxExpUser.jid.split('@')[0]}\n` +
                `┃ ⭐ ${formatNumber(maxExpUser.exp)} (${expPct}%)\n` +
                `╰┈┈⬡\n\n` +
                `╭┈┈⬡「 🎟️ *ᴛᴏᴘ ʟɪᴍɪᴛ* 」\n` +
                `┃ 👤 @${maxLimUser.jid.split('@')[0]}\n` +
                `┃ 🎫 ${formatNumber(maxLimUser.limit)} (${limPct}%)\n` +
                `╰┈┈⬡\n\n` +
                `> Gunakan \`.topbalance\`, \`.topexp\`, \`.toplimit\`\n` +
                `> untuk melihat ranking lengkap.`,
            mentions
        }, { quoted: m })
    }
    
    let text = `${emoji} *${title}*\n\n`
    text += `📊 Total: *${users.length}* user\n\n`
    
    const total = users.reduce((sum, u) => sum + u[field], 0)
    const mentions = []
    
    sortedUsers.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
        const pct = total > 0 ? ((u[field] / total) * 100).toFixed(1) : 0
        text += `${medal} @${u.jid.split('@')[0]}\n`
        text += `   └ ${formatNumber(u[field])} (${pct}%)\n\n`
        mentions.push(u.jid)
    })
    
    text += `> Ranking berdasarkan ${field}`
    
    await sock.sendMessage(m.chat, {
        text,
        mentions
    }, { quoted: m })
}

function formatNumber(num) {
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B'
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toString()
}

module.exports = {
    config: pluginConfig,
    handler
}
