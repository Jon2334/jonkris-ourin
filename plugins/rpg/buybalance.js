const { getDatabase } = require('../../src/lib/database')
const { getRpgContextInfo } = require('../../src/lib/contextHelper')
const config = require('../../config')
const path = require('path')
const fs = require('fs')

const pluginConfig = {
    name: 'buybalance',
    alias: ['belibalan', 'buybal', 'exptobal'],
    category: 'rpg',
    description: 'Tukar EXP menjadi Balance',
    usage: '.buybalance <jumlah>',
    example: '.buybalance 10000',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

const EXP_PER_BALANCE = 2

let thumbRpg = null
try {
    const thumbPath = path.join(process.cwd(), 'assets', 'images', 'ourin-rpg.jpg')
    if (fs.existsSync(thumbPath)) thumbRpg = fs.readFileSync(thumbPath)
} catch (e) {}

function getContextInfo(title = '💱 *ʙᴜʏ ʙᴀʟᴀɴᴄᴇ*', body = 'Tukar EXP') {
    const saluranId = config.saluran?.id || '120363208449943317@newsletter'
    const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
    
    const contextInfo = {
        forwardingScore: 9999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127
        }
    }
    
    if (thumbRpg) {
        contextInfo.externalAdReply = {
            title: title,
            body: body,
            thumbnail: thumbRpg,
            mediaType: 1,
            renderLargerThumbnail: false,
            sourceUrl: config.saluran?.link || ''
        }
    }
    
    return contextInfo
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    
    const args = m.args || []
    const amountStr = args[0]
    
    if (!amountStr) {
        let txt = `💱 *ʙᴜʏ ʙᴀʟᴀɴᴄᴇ*\n\n`
        txt += `> Tukar EXP menjadi Balance!\n\n`
        txt += `╭┈┈⬡「 📊 *ᴋᴜʀs* 」\n`
        txt += `┃ 💎 ${EXP_PER_BALANCE} EXP = Rp 1\n`
        txt += `╰┈┈⬡\n\n`
        txt += `╭┈┈⬡「 📋 *sᴀʟᴅᴏᴍᴜ* 」\n`
        txt += `┃ 🚄 EXP: *${(user.exp || 0).toLocaleString('id-ID')}*\n`
        txt += `┃ 💰 Balance: *Rp ${(user.balance || 0).toLocaleString('id-ID')}*\n`
        txt += `╰┈┈⬡\n\n`
        txt += `> Contoh: \`.buybalance 10000\`\n`
        txt += `> Akan menggunakan ${10000 * EXP_PER_BALANCE} EXP untuk Rp 10.000`
        
        return m.reply(txt)
    }
    
    let balanceAmount = 0
    if (amountStr === 'all' || amountStr === 'max') {
        balanceAmount = Math.floor((user.exp || 0) / EXP_PER_BALANCE)
    } else {
        balanceAmount = parseInt(amountStr)
    }
    
    if (!balanceAmount || balanceAmount <= 0) {
        return m.reply(`❌ Masukkan jumlah balance yang valid!`)
    }
    
    const expNeeded = balanceAmount * EXP_PER_BALANCE
    
    if ((user.exp || 0) < expNeeded) {
        const maxPossible = Math.floor((user.exp || 0) / EXP_PER_BALANCE)
        return m.reply(
            `❌ *EXP tidak cukup!*\n\n` +
            `> Dibutuhkan: *${expNeeded.toLocaleString('id-ID')} EXP*\n` +
            `> EXP kamu: *${(user.exp || 0).toLocaleString('id-ID')} EXP*\n\n` +
            `> Maksimal: *Rp ${maxPossible.toLocaleString('id-ID')}*`
        )
    }
    
    const newExp = (user.exp || 0) - expNeeded
    const newBalance = (user.balance || 0) + balanceAmount
    
    db.setUser(m.sender, {
        exp: newExp,
        balance: newBalance
    })
    
    await m.react('💱')
    
    let txt = `💱 *ᴛᴜᴋᴀʀ ʙᴇʀʜᴀsɪʟ!*\n\n`
    txt += `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n`
    txt += `┃ 🚄 EXP: *-${expNeeded.toLocaleString('id-ID')}*\n`
    txt += `┃ 💰 Balance: *+Rp ${balanceAmount.toLocaleString('id-ID')}*\n`
    txt += `╰┈┈⬡\n\n`
    txt += `╭┈┈⬡「 📊 *sᴀʟᴅᴏ sᴇᴋᴀʀᴀɴɢ* 」\n`
    txt += `┃ 🚄 EXP: *${newExp.toLocaleString('id-ID')}*\n`
    txt += `┃ 💰 Balance: *Rp ${newBalance.toLocaleString('id-ID')}*\n`
    txt += `╰┈┈⬡`
    
    await sock.sendMessage(m.chat, {
        text: txt,
        contextInfo: getContextInfo()
    }, { quoted: m })
}

module.exports = {
    config: pluginConfig,
    handler
}
