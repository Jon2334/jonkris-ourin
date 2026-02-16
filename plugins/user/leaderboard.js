const { getDatabase } = require('../../src/lib/database')

const pluginConfig = {
    name: 'leaderboard',
    alias: ['lb', 'top', 'ranking', 'topxp', 'rank'],
    category: 'user',
    description: 'Melihat top global players (Money/Level)',
    usage: '.leaderboard <money/level>',
    example: '.leaderboard money',
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
    const users = db.data?.users || db.getAllUsers?.() || {}
    
    const args = m.args || []
    const type = args[0]?.toLowerCase() || 'money'
    
    const sortedUsers = Object.entries(users).map(([jid, data]) => ({
        jid,
        name: data.name || 'User',
        balance: data.balance || 0,
        level: data.rpg?.level || 1,
        exp: data.rpg?.exp || 0
    }))
    
    let txt = ''
    
    if (type === 'money' || type === 'balance') {
        sortedUsers.sort((a, b) => b.balance - a.balance)
        const top = sortedUsers.slice(0, 10)
        
        txt = `🏆 *ᴛᴏᴘ ɢʟᴏʙᴀʟ ᴍᴏɴᴇʏ* 🏆\n\n`
        top.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
            txt += `${medal} @${u.jid.split('@')[0]}\n`
            txt += `   💰 Rp ${u.balance.toLocaleString('id-ID')}\n`
        })
    } else if (type === 'level' || type === 'exp') {
        sortedUsers.sort((a, b) => b.exp - a.exp)
        const top = sortedUsers.slice(0, 10)
        
        txt = `🏆 *ᴛᴏᴘ ɢʟᴏʙᴀʟ ʟᴇᴠᴇʟ* 🏆\n\n`
        top.forEach((u, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
            txt += `${medal} @${u.jid.split('@')[0]}\n`
            txt += `   📊 Lv. ${u.level} (${u.exp} exp)\n`
        })
    } else {
        return m.reply(`❌ Tipe tidak valid. Gunakan \`.top money\` atau \`.top level\``)
    }
    
    txt += `\n> Kamu berada di posisi: #${sortedUsers.findIndex(u => u.jid === m.sender) + 1}`
    
    await m.reply(txt, { mentions: sortedUsers.slice(0, 10).map(u => u.jid) })
}

module.exports = {
    config: pluginConfig,
    handler
}
