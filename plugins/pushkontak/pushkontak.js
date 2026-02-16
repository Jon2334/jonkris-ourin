const fs = require('fs')
const path = require('path')
const { getDatabase } = require('../../src/lib/database')
const { getGroupMode } = require('../group/botmode')

const pluginConfig = {
    name: 'pushkontak',
    alias: ['puskontak', 'push'],
    category: 'pushkontak',
    description: 'Push pesan ke semua member grup',
    usage: '.pushkontak <pesan>',
    example: '.pushkontak Halo semuanya!',
    isOwner: true,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    limit: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const groupMode = getGroupMode(m.chat, db)
    
    if (groupMode !== 'pushkontak') {
        return m.reply(`❌ *ᴍᴏᴅᴇ ᴛɪᴅᴀᴋ sᴇsᴜᴀɪ*\n\n> Aktifkan mode pushkontak terlebih dahulu\n\n\`${m.prefix}botmode pushkontak\``)
    }
    
    const text = m.text?.trim()
    if (!text) {
        return m.reply(`📢 *ᴘᴜsʜ ᴋᴏɴᴛᴀᴋ*\n\n> Masukkan pesan yang ingin dikirim\n\n\`Contoh: ${m.prefix}pushkontak Halo semuanya!\``)
    }
    
    if (global.statuspush) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Pushkontak sedang berjalan. Ketik \`${m.prefix}stoppush\` untuk menghentikan.`)
    }
    
    m.react('📢')
    
    try {
        const metadata = await sock.groupMetadata(m.chat)
        const participants = metadata.participants
            .map(p => p.id)
            .filter(id => id !== sock.user.id.split(':')[0] + '@s.whatsapp.net')
            .filter(id => !id.includes(m.sender))
        
        if (participants.length === 0) {
            m.react('❌')
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak ada member yang bisa dikirim`)
        }
        
        const jedaPush = db.setting('jedaPush') || 5000
        
        await m.reply(
            `📢 *ᴘᴜsʜ ᴋᴏɴᴛᴀᴋ*\n\n` +
            `╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」\n` +
            `┃ 📝 ᴘᴇsᴀɴ: \`${text.substring(0, 50)}${text.length > 50 ? '...' : ''}\`\n` +
            `┃ 👥 ᴛᴀʀɢᴇᴛ: \`${participants.length}\` member\n` +
            `┃ ⏱️ ᴊᴇᴅᴀ: \`${jedaPush}ms\`\n` +
            `┃ 📊 ᴇsᴛɪᴍᴀsɪ: \`${Math.ceil((participants.length * jedaPush) / 60000)} menit\`\n` +
            `╰┈┈⬡\n\n` +
            `> Memulai push...`
        )
        
        global.statuspush = true
        let successCount = 0
        let failedCount = 0
        
        function randomKode(length) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
            let result = ''
            for (let i = 0; i < length; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length))
            }
            return result
        }
        
        for (const member of participants) {
            if (global.stoppush) {
                delete global.stoppush
                delete global.statuspush
                
                await m.reply(
                    `⏹️ *ᴘᴜsʜ ᴅɪʜᴇɴᴛɪᴋᴀɴ*\n\n` +
                    `> ✅ Berhasil: \`${successCount}\`\n` +
                    `> ❌ Gagal: \`${failedCount}\`\n` +
                    `> ⏸️ Sisa: \`${participants.length - successCount - failedCount}\``
                )
                return
            }
            
            try {
                const kodeUnik = randomKode(6)
                const pesan = `${text}\n\n#${kodeUnik}`
                
                await sock.sendMessage(member, { text: pesan })
                successCount++
            } catch (err) {
                failedCount++
            }
            
            await new Promise(resolve => setTimeout(resolve, jedaPush))
        }
        
        delete global.statuspush
        
        m.react('✅')
        await m.reply(
            `✅ *ᴘᴜsʜ sᴇʟᴇsᴀɪ*\n\n` +
            `╭┈┈⬡「 📊 *ʜᴀsɪʟ* 」\n` +
            `┃ ✅ ʙᴇʀʜᴀsɪʟ: \`${successCount}\`\n` +
            `┃ ❌ ɢᴀɢᴀʟ: \`${failedCount}\`\n` +
            `┃ 📊 ᴛᴏᴛᴀʟ: \`${participants.length}\`\n` +
            `╰┈┈⬡`
        )
        
    } catch (error) {
        delete global.statuspush
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
