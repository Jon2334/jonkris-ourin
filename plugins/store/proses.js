const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')

const pluginConfig = {
    name: 'proses',
    alias: ['process', 'prosestransaksi'],
    category: 'store',
    description: 'Mulai proses transaksi dengan buyer',
    usage: '.proses <produk> | <nominal> | <nama_buyer>',
    example: '.proses AKUN FF | 45000 | Zann',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    if (!m.quoted) {
        return m.reply(
            `📦 *ᴘʀᴏsᴇs ᴛʀᴀɴsᴀᴋsɪ*\n\n` +
            `> Reply pesan buyer lalu ketik:\n\n` +
            `\`${m.prefix}proses <produk> | <nominal> | <nama>\`\n\n` +
            `*ᴄᴏɴᴛᴏʜ:*\n` +
            `\`${m.prefix}proses AKUN FF | 45000 | Zann\`\n\n` +
            `> Setelah selesai, buyer tinggal ketik "Done"`
        )
    }
    
    const text = m.text?.trim()
    if (!text) {
        return m.reply(`❌ Format: \`${m.prefix}proses <produk> | <nominal> | <nama>\``)
    }
    
    const parts = text.split('|').map(p => p.trim())
    if (parts.length < 2) {
        return m.reply(`❌ Format salah!\n\n> Gunakan: \`${m.prefix}proses <produk> | <nominal> | <nama>\``)
    }
    
    const produk = parts[0]
    const nominal = parts[1]
    const buyerName = parts[2] || m.quoted.pushName || 'Buyer'
    const buyerJid = m.quoted.sender || m.quotedSender
    
    if (!buyerJid) {
        return m.reply(`❌ Tidak bisa mendapatkan nomor buyer! Coba reply pesan buyer langsung.`)
    }
    
    let sessions = db.setting('transactionSessions') || {}
    
    if (sessions[buyerJid]) {
        return m.reply(
            `⚠️ Buyer ini sudah ada transaksi aktif!\n\n` +
            `> Produk: ${sessions[buyerJid].produk}\n` +
            `> Nominal: ${sessions[buyerJid].nominal}\n\n` +
            `> Hapus dengan \`${m.prefix}cancelproses @buyer\``
        )
    }
    
    sessions[buyerJid] = {
        produk,
        nominal,
        buyerName,
        buyerJid,
        sellerJid: m.sender,
        chatJid: m.chat,
        startedAt: Date.now(),
        status: 'processing'
    }
    
    db.setting('transactionSessions', sessions)
    await db.save()
    
    const saluranId = config.saluran?.id || '120363208449943317@newsletter'
    const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
    
    await sock.sendMessage(m.chat, {
        text: `✅ *ᴘʀᴏsᴇs ᴅɪᴍᴜʟᴀɪ!*\n\n` +
            `╭┈┈⬡「 📦 *ᴅᴇᴛᴀɪʟ* 」\n` +
            `┃ 🛒 Produk: *${produk}*\n` +
            `┃ 💰 Nominal: *${nominal}*\n` +
            `┃ 👤 Buyer: @${buyerJid.split('@')[0]}\n` +
            `┃ 📝 Nama: *${buyerName}*\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> ✨ Buyer tinggal ketik *"Done"* untuk invoice`,
        mentions: [buyerJid],
        contextInfo: {
            mentionedJid: [buyerJid],
            forwardingScore: 9999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: saluranId,
                newsletterName: saluranName,
                serverMessageId: 127
            }
        }
    }, { quoted: m })
    
    m.react('✅')
}

module.exports = {
    config: pluginConfig,
    handler
}
