const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')

const pluginConfig = {
    name: 'setdone',
    alias: ['doneconfig', 'configdone'],
    category: 'store',
    description: 'Set template untuk .done',
    usage: '.setdone template <full text>',
    example: '.setdone template TESTI\\n\\nBuyer: {buyer}',
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
    const text = m.text?.trim() || ''
    const args = text.split(' ')
    const option = args[0]?.toLowerCase()
    
    const current = db.setting('doneTemplate') || {}
    
    if (!option) {
        let info = `⚙️ *sᴇᴛ ᴅᴏɴᴇ ᴛᴇᴍᴘʟᴀᴛᴇ*\n\n`
        info += `╭┈┈⬡「 📋 *ᴄᴜʀʀᴇɴᴛ sᴇᴛᴛɪɴɢs* 」\n`
        info += `┃ ▧ Template: ${current.template ? '✅ Set' : '❌ Default'}\n`
        info += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        info += `*ᴜsᴀɢᴇ:*\n\n`
        info += `1️⃣ *Set Template Lengkap:*\n`
        info += `\`${m.prefix}setdone template <text>\`\n\n`
        info += `2️⃣ *Contoh:*\n`
        info += `\`\`\`\n${m.prefix}setdone template OURIN STORE TESTIMONI\n\nPEMBELI = {buyer}\nTANGGAL = {date}\nTRX = {trx}\nBARANG = {produk}\nNOMINAL = {nominal}\nSTATUS Done\n\nPEMBELI KE {count_buyer}\n\nTerima kasih sudah berbelanja\n\`\`\`\n\n`
        info += `*ᴘʟᴀᴄᴇʜᴏʟᴅᴇʀs:*\n`
        info += `> {buyer} = Nama buyer\n`
        info += `> {date} = Tanggal (DD-MM-YYYY)\n`
        info += `> {trx} = Nomor transaksi\n`
        info += `> {produk} = Nama produk\n`
        info += `> {nominal} = Harga\n`
        info += `> {count_buyer} = Total pembeli\n\n`
        info += `3️⃣ *Reset Template:*\n`
        info += `\`${m.prefix}setdone reset\`\n\n`
        info += `4️⃣ *Preview Template:*\n`
        info += `\`${m.prefix}setdone preview\``
        
        return m.reply(info)
    }
    
    if (option === 'reset') {
        db.setting('doneTemplate', {})
        await db.save()
        return m.reply(`✅ Template .done direset ke default!`)
    }
    
    if (option === 'preview') {
        const template = current.template
        if (!template) {
            return m.reply(`❌ Belum ada template! Set dulu dengan:\n\n\`${m.prefix}setdone template <text>\``)
        }
        
        const now = new Date()
        const previewText = template
            .replace(/{buyer}/gi, 'Zann (Preview)')
            .replace(/{date}/gi, `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`)
            .replace(/{trx}/gi, '#001')
            .replace(/{produk}/gi, 'AKUN FREE FIRE')
            .replace(/{nominal}/gi, 'Rp 45.000')
            .replace(/{count_buyer}/gi, '1')
        
        return m.reply(`📋 *ᴘʀᴇᴠɪᴇᴡ ᴛᴇᴍᴘʟᴀᴛᴇ:*\n\n${previewText}`)
    }
    
    if (option === 'template') {
        const templateText = m.fullArgs.slice(9).trim()
        
        if (!templateText) {
            return m.reply(`❌ Template tidak boleh kosong!\n\n> Contoh: \`${m.prefix}setdone template TESTI\\n\\nBuyer: {buyer}\``)
        }
        
        current.template = templateText
        db.setting('doneTemplate', current)
        await db.save()
        
        return m.reply(`✅ *ᴛᴇᴍᴘʟᴀᴛᴇ ᴅɪsɪᴍᴘᴀɴ!*\n\n> Gunakan \`${m.prefix}setdone preview\` untuk melihat hasil\n\n> Ketik \`${m.prefix}done\` atau buyer ketik "Done" setelah proses`)
    }
    
    return m.reply(`❌ Option tidak valid!\n\n> Gunakan: \`template\`, \`preview\`, atau \`reset\``)
}

module.exports = {
    config: pluginConfig,
    handler
}
