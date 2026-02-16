const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')

const pluginConfig = {
    name: 'done',
    alias: ['selesai', 'completed'],
    category: 'store',
    description: 'Konfirmasi pembelian selesai',
    usage: '.done',
    example: '.done',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 0,
    isEnabled: true
}

function generateInvoice(db, session = null, buyerName = null) {
    const doneSettings = db.setting('doneTemplate') || {}
    const template = doneSettings.template
    
    const trxCount = (db.setting('trxCounter') || 0) + 1
    db.setting('trxCounter', trxCount)
    
    const now = new Date()
    const tanggal = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`
    
    const produk = session?.produk || doneSettings.barang || '-'
    const nominal = session?.nominal || doneSettings.nominal || '-'
    const buyer = session?.buyerName || buyerName || 'Buyer'
    
    if (template) {
        return template
            .replace(/{buyer}/gi, buyer)
            .replace(/{date}/gi, tanggal)
            .replace(/{trx}/gi, `#${trxCount}`)
            .replace(/{produk}/gi, produk)
            .replace(/{nominal}/gi, nominal)
            .replace(/{count_buyer}/gi, trxCount.toString())
    }
    
    return `⿻  ⌜ 𝗧𝗥𝗫 𝗗𝗢𝗡𝗘 ⌟  ⿻
─────────────────
▧ 𝗡𝗼𝗺𝗶𝗻𝗮𝗹 : ${nominal}
▧ 𝗧𝗮𝗻𝗴𝗴𝗮𝗹 : ${tanggal}
▧ 𝗕𝗮𝗿𝗮𝗻𝗴 : ${produk}
▧ 𝗕𝘂𝘆𝗲𝗿 : ${buyer}
─────────────────
#${trxCount}`
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    const invoiceText = generateInvoice(db, null, m.pushName)
    await db.save()
    
    const saluranId = config.saluran?.id || '120363208449943317@newsletter'
    const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
    
    await sock.sendMessage(m.chat, {
        text: invoiceText,
        contextInfo: {
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

async function handleBuyerDone(m, sock, session) {
    const db = getDatabase()
    
    const invoiceText = generateInvoice(db, session, session.buyerName)
    await db.save()
    
    const saluranId = config.saluran?.id || '120363208449943317@newsletter'
    const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
    
    await sock.sendMessage(m.chat, {
        text: `✅ *ᴛʀᴀɴsᴀᴋsɪ sᴇʟᴇsᴀɪ!*\n\n${invoiceText}`,
        mentions: [session.buyerJid, session.sellerJid],
        contextInfo: {
            mentionedJid: [session.buyerJid, session.sellerJid],
            forwardingScore: 9999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: saluranId,
                newsletterName: saluranName,
                serverMessageId: 127
            }
        }
    }, { quoted: m })
}

module.exports = {
    config: pluginConfig,
    handler,
    handleBuyerDone,
    generateInvoice
}
