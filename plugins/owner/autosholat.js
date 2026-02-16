const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')

const pluginConfig = {
    name: 'autosholat',
    alias: ['sholat', 'autoadzan'],
    category: 'owner',
    description: 'Toggle pengingat waktu sholat otomatis dengan audio adzan dan tutup grup',
    usage: '.autosholat on/off/status',
    example: '.autosholat on',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

const JADWAL_SHOLAT = {
    shubuh: '04:29',
    terbit: '05:44',
    dhuha: '06:02',
    dzuhur: '12:02',
    ashar: '15:15',
    magrib: '17:52',
    isya: '19:01'
}

const AUDIO_ADZAN = 'https://media.vocaroo.com/mp3/1ofLT2YUJAjQ'

async function handler(m, { sock, db }) {
    const args = m.args[0]?.toLowerCase()
    const database = getDatabase()
    
    if (!args || args === 'status') {
        const status = database.setting('autoSholat') ? '✅ Aktif' : '❌ Nonaktif'
        const closeGroup = database.setting('autoSholatCloseGroup') ? '✅ Ya' : '❌ Tidak'
        const duration = database.setting('autoSholatDuration') || 5
        
        let jadwalText = ''
        for (const [nama, waktu] of Object.entries(JADWAL_SHOLAT)) {
            jadwalText += `┃ ${nama.charAt(0).toUpperCase() + nama.slice(1)}: \`${waktu}\`\n`
        }
        
        return m.reply(
            `🕌 *ᴀᴜᴛᴏ sʜᴏʟᴀᴛ*\n\n` +
            `╭┈┈⬡「 📋 *sᴛᴀᴛᴜs* 」\n` +
            `┃ 🔔 ᴀᴜᴛᴏ sʜᴏʟᴀᴛ: ${status}\n` +
            `┃ 🔒 ᴛᴜᴛᴜᴘ ɢʀᴜᴘ: ${closeGroup}\n` +
            `┃ ⏱️ ᴅᴜʀᴀsɪ: \`${duration}\` menit\n` +
            `╰┈┈⬡\n\n` +
            `╭┈┈⬡「 🕐 *ᴊᴀᴅᴡᴀʟ* 」\n` +
            jadwalText +
            `╰┈┈⬡\n\n` +
            `> *Penggunaan:*\n` +
            `> \`${m.prefix}autosholat on\` - Aktifkan\n` +
            `> \`${m.prefix}autosholat off\` - Nonaktifkan\n` +
            `> \`${m.prefix}autosholat close on/off\` - Toggle tutup grup\n` +
            `> \`${m.prefix}autosholat duration <menit>\` - Set durasi tutup\n\n` +
            `> _Wilayah: Jakarta (WIB)_`
        )
    }
    
    if (args === 'on') {
        database.setting('autoSholat', true)
        m.react('✅')
        return m.reply(
            `✅ *ᴀᴜᴛᴏ sʜᴏʟᴀᴛ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*\n\n` +
            `> Pengingat waktu sholat aktif\n` +
            `> Audio adzan akan dikirim ke semua grup\n` +
            `> Wilayah: Jakarta (WIB)`
        )
    }
    
    if (args === 'off') {
        database.setting('autoSholat', false)
        m.react('❌')
        return m.reply(`❌ *ᴀᴜᴛᴏ sʜᴏʟᴀᴛ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ*`)
    }
    
    if (args === 'close') {
        const subArg = m.args[1]?.toLowerCase()
        if (subArg === 'on') {
            database.setting('autoSholatCloseGroup', true)
            m.react('🔒')
            return m.reply(`🔒 *ᴛᴜᴛᴜᴘ ɢʀᴜᴘ ᴅɪᴀᴋᴛɪꜰᴋᴀɴ*\n\n> Grup akan ditutup saat waktu sholat`)
        }
        if (subArg === 'off') {
            database.setting('autoSholatCloseGroup', false)
            m.react('🔓')
            return m.reply(`🔓 *ᴛᴜᴛᴜᴘ ɢʀᴜᴘ ᴅɪɴᴏɴᴀᴋᴛɪꜰᴋᴀɴ*\n\n> Grup tidak akan ditutup saat waktu sholat`)
        }
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Gunakan: \`${m.prefix}autosholat close on/off\``)
    }
    
    if (args === 'duration') {
        const duration = parseInt(m.args[1])
        if (isNaN(duration) || duration < 1 || duration > 60) {
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Durasi harus antara 1-60 menit`)
        }
        database.setting('autoSholatDuration', duration)
        m.react('⏱️')
        return m.reply(`⏱️ *ᴅᴜʀᴀsɪ ᴅɪsᴇᴛ*\n\n> Grup akan ditutup \`${duration}\` menit saat waktu sholat`)
    }
    
    return m.reply(`❌ *ᴀᴄᴛɪᴏɴ ᴛɪᴅᴀᴋ ᴠᴀʟɪᴅ*\n\n> Gunakan: \`on\`, \`off\`, \`close on/off\`, \`duration <menit>\``)
}

async function runAutoSholat(sock) {
    const db = getDatabase()
    
    if (!db.setting('autoSholat')) return
    
    const timeHelper = require('../../src/lib/timeHelper')
    const timeNow = timeHelper.getCurrentTimeString()
    
    if (!global.autoSholatLock) global.autoSholatLock = {}
    
    for (const [sholat, waktu] of Object.entries(JADWAL_SHOLAT)) {
        if (timeNow === waktu && !global.autoSholatLock[sholat]) {
            global.autoSholatLock[sholat] = true
            try {
                global.isFetchingGroups = true
                const groupsObj = await sock.groupFetchAllParticipating()
                global.isFetchingGroups = false
                const groupList = Object.keys(groupsObj)
                
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
                
                const closeGroup = db.setting('autoSholatCloseGroup') || false
                const duration = db.setting('autoSholatDuration') || 5

                const GambarSuasana = {
                    subuh: "https://files.cloudkuimages.guru/images/61c43a618c30.jpg",
                    dzuhur: "https://files.cloudkuimages.guru/images/57b4f4639bc3.jpg",
                    asr: " https://files.cloudkuimages.guru/images/e6c4e032aa53.webp",
                    maghrib: "https://files.cloudkuimages.guru/images/da65b383dea6.webp",
                    isya: "https://files.cloudkuimages.guru/images/e35488beb40c.jpg"
                }
                
                for (const jid of groupList) {
                    try {
                        const caption = `🕌 *ᴡᴀᴋᴛᴜ sʜᴏʟᴀᴛ ${sholat.toUpperCase()}*\n\n` +
                            `> Waktu: \`${waktu} WIB\`\n` +
                            `> Ayo tunaikan sholat! 🤲\n\n` +
                            (closeGroup ? `> _Grup ditutup ${duration} menit_` : '')
                        
                        await sock.sendMessage(jid, {
                            audio: { url: AUDIO_ADZAN },
                            mimetype: 'audio/mpeg',
                            ptt: false,
                            contextInfo: {
                                externalAdReply: {
                                    title: `🕌 Waktu ${sholat.toUpperCase()}`,
                                    body: caption.replace(/[*_`]/g, '').substring(0, 100),
                                    thumbnailUrl: GambarSuasana[sholat],
                                    sourceUrl: config.saluran?.link || 'https://waktunya.ibadah',
                                    mediaType: 2,
                                    renderLargerThumbnail: true
                                },
                                forwardingScore: 9999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: saluranId,
                                    newsletterName: saluranName,
                                    serverMessageId: 127
                                }
                            }
                        })
                        
                        if (closeGroup) {
                            await sock.groupSettingUpdate(jid, 'announcement')
                        }
                        
                        await new Promise(res => setTimeout(res, 500))
                    } catch (e) {
                        console.log(`[AutoSholat] Gagal kirim ke ${jid}:`, e.message)
                    }
                }
                
                if (closeGroup) {
                    setTimeout(async () => {
                        for (const jid of groupList) {
                            try {
                                await sock.groupSettingUpdate(jid, 'not_announcement')
                                await sock.sendMessage(jid, {
                                    text: `✅ Grup dibuka kembali setelah sholat ${sholat}.`,
                                    contextInfo: contextInfo
                                })
                                await new Promise(res => setTimeout(res, 600))
                            } catch (e) {
                                console.log(`[AutoSholat] Gagal buka grup ${jid}:`, e.message)
                            }
                        }
                        console.log(`[AutoSholat] Semua grup dibuka kembali`)
                    }, duration * 60 * 1000)
                }
                
                console.log(`[AutoSholat] Pengingat ${sholat} terkirim ke ${groupList.length} grup`)
                
            } catch (error) {
                global.isFetchingGroups = false
                console.error('[AutoSholat] Error:', error.message)
            }
            
            setTimeout(() => {
                delete global.autoSholatLock[sholat]
            }, 2 * 60 * 1000)
        }
    }
}

module.exports = {
    config: pluginConfig,
    handler,
    runAutoSholat,
    JADWAL_SHOLAT,
    AUDIO_ADZAN
}
