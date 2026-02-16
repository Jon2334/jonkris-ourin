const config = require('../../config')
const { getDatabase } = require('../../src/lib/database')
const { addJadibotPremium, removeJadibotPremium, getJadibotPremiums } = require('../../src/lib/jadibotDatabase')

const pluginConfig = {
    name: 'addprem',
    alias: ['addpremium', 'setprem', 'delprem', 'delpremium', 'listprem', 'premlist'],
    category: 'owner',
    description: 'Kelola premium users',
    usage: '.addprem <nomor/@tag>',
    example: '.addprem 6281234567890',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    limit: 0,
    isEnabled: true
}

async function handler(m, { sock, jadibotId, isJadibot }) {
    const db = getDatabase()
    const cmd = m.command.toLowerCase()
    
    const isAdd = ['addprem', 'addpremium', 'setprem'].includes(cmd)
    const isDel = ['delprem', 'delpremium'].includes(cmd)
    const isList = ['listprem', 'premlist'].includes(cmd)
    
    if (!config.premiumUsers) config.premiumUsers = []
    
    if (isList) {
        if (isJadibot && jadibotId) {
            const jbPremiums = getJadibotPremiums(jadibotId)
            if (jbPremiums.length === 0) {
                return m.reply(`💎 *ᴅᴀꜰᴛᴀʀ ᴘʀᴇᴍɪᴜᴍ ᴊᴀᴅɪʙᴏᴛ*\n\n> Belum ada premium terdaftar.\n> Gunakan \`${m.prefix}addprem\` untuk menambah.`)
            }
            let txt = `💎 *ᴅᴀꜰᴛᴀʀ ᴘʀᴇᴍɪᴜᴍ ᴊᴀᴅɪʙᴏᴛ*\n\n`
            txt += `> Bot: *${jadibotId}*\n`
            txt += `> Total: *${jbPremiums.length}* premium\n\n`
            jbPremiums.forEach((p, i) => {
                const num = typeof p === 'string' ? p : p.jid
                txt += `${i + 1}. 💎 \`${num}\`\n`
            })
            return m.reply(txt)
        }
        
        if (config.premiumUsers.length === 0) {
            return m.reply(`💎 *ᴅᴀꜰᴛᴀʀ ᴘʀᴇᴍɪᴜᴍ*\n\n> Belum ada premium terdaftar.`)
        }
        let txt = `💎 *ᴅᴀꜰᴛᴀʀ ᴘʀᴇᴍɪᴜᴍ*\n\n`
        txt += `> Total: *${config.premiumUsers.length}* premium\n\n`
        config.premiumUsers.forEach((s, i) => {
            txt += `${i + 1}. 💎 \`${s}\`\n`
        })
        return m.reply(txt)
    }
    
    let targetNumber = ''
    if (m.quoted) {
        targetNumber = m.quoted.sender?.replace(/[^0-9]/g, '') || ''
    } else if (m.mentionedJid?.length) {
        targetNumber = m.mentionedJid[0]?.replace(/[^0-9]/g, '') || ''
    } else if (m.args[0]) {
        targetNumber = m.args[0].replace(/[^0-9]/g, '')
    }
    
    if (!targetNumber) {
        return m.reply(`💎 *${isAdd ? 'ADD' : 'DEL'} ᴘʀᴇᴍɪᴜᴍ*\n\n> Masukkan nomor atau tag user\n\n\`Contoh: ${m.prefix}${cmd} 6281234567890\``)
    }
    
    if (targetNumber.startsWith('0')) {
        targetNumber = '62' + targetNumber.slice(1)
    }
    
    if (targetNumber.length < 10 || targetNumber.length > 15) {
        return m.reply(`❌ Format nomor tidak valid`)
    }
    
    if (isJadibot && jadibotId) {
        if (isAdd) {
            if (addJadibotPremium(jadibotId, targetNumber)) {
                m.react('💎')
                return m.reply(
                    `💎 *ᴘʀᴇᴍɪᴜᴍ ᴊᴀᴅɪʙᴏᴛ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ*\n\n` +
                    `> Bot: \`${jadibotId}\`\n` +
                    `> Nomor: \`${targetNumber}\`\n` +
                    `> Total: *${getJadibotPremiums(jadibotId).length}* premium`
                )
            } else {
                return m.reply(`❌ \`${targetNumber}\` sudah premium di Jadibot ini.`)
            }
        } else if (isDel) {
            if (removeJadibotPremium(jadibotId, targetNumber)) {
                m.react('✅')
                return m.reply(
                    `✅ *ᴘʀᴇᴍɪᴜᴍ ᴊᴀᴅɪʙᴏᴛ ᴅɪʜᴀᴘᴜs*\n\n` +
                    `> Bot: \`${jadibotId}\`\n` +
                    `> Nomor: \`${targetNumber}\`\n` +
                    `> Total: *${getJadibotPremiums(jadibotId).length}* premium`
                )
            } else {
                return m.reply(`❌ \`${targetNumber}\` bukan premium di Jadibot ini.`)
            }
        }
        return
    }
    
    if (isAdd) {
        if (config.premiumUsers.includes(targetNumber)) {
            return m.reply(`❌ \`${targetNumber}\` sudah premium`)
        }
        config.premiumUsers.push(targetNumber)
        db.setting('premiumUsers', config.premiumUsers)
        await db.save()
        m.react('💎')
        return m.reply(
            `💎 *ᴘʀᴇᴍɪᴜᴍ ᴅɪᴛᴀᴍʙᴀʜᴋᴀɴ*\n\n` +
            `> Nomor: \`${targetNumber}\`\n` +
            `> Total: *${config.premiumUsers.length}* premium`
        )
    } else if (isDel) {
        if (!config.premiumUsers.includes(targetNumber)) {
            return m.reply(`❌ \`${targetNumber}\` bukan premium`)
        }
        config.premiumUsers = config.premiumUsers.filter(s => s !== targetNumber)
        db.setting('premiumUsers', config.premiumUsers)
        await db.save()
        m.react('✅')
        return m.reply(
            `✅ *ᴘʀᴇᴍɪᴜᴍ ᴅɪʜᴀᴘᴜs*\n\n` +
            `> Nomor: \`${targetNumber}\`\n` +
            `> Total: *${config.premiumUsers.length}* premium`
        )
    }
}

function loadPremium() {
    try {
        const { getDatabase } = require('../../src/lib/database')
        const db = getDatabase()
        if (!db || !db.db || !db.db.data) {
            setTimeout(loadPremium, 3000)
            return
        }
        
        const savedPremium = db.setting('premiumUsers') || []
        if (savedPremium.length > 0) {
            if (!config.premiumUsers) config.premiumUsers = []
            for (const prem of savedPremium) {
                if (prem && !config.premiumUsers.includes(prem)) {
                    config.premiumUsers.push(prem)
                }
            }
            console.log(`[AddPrem] Loaded ${savedPremium.length} premium users from database`)
        }
    } catch (e) {
        setTimeout(loadPremium, 3000)
    }
}

setTimeout(loadPremium, 3000)

module.exports = {
    config: pluginConfig,
    handler,
    loadPremium
}
