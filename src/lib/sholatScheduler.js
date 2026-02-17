const { getDatabase } = require('./database')
const { logger } = require('./colors')
const config = require('../../config')

const JADWAL_SHOLAT = {
    Imsak: '04:39',
    Subuh: '04:49',
    Terbit: '06:04',
    Dhuha: '06:30',
    Dzuhur: '12:06',
    Ashar: '15:21',
    Maghrib: '18:08',
    Isya: '19:38'
}

const SHOLAT_MESSAGES = {
    Imsak: '🌙 *WAKTU IMSAK*\n\n> Hai Sahabat, waktu Imsak telah tiba.\n> Segera makan sahur sebelum waktu habis.',
    Subuh: '🌅 *WAKTU SUBUH*\n\n> Hai Sahabat, waktu Sholat Subuh telah tiba.\n> Ambilah air wudhu dan segeralah sholat.',
    Terbit: '☀️ *WAKTU TERBIT*\n\n> Matahari telah terbit.\n> Selamat beraktivitas hari ini!',
    Dhuha: '🌤️ *WAKTU DHUHA*\n\n> Hai Sahabat, waktu Sholat Dhuha telah tiba.\n> Jangan lupa sholat Dhuha 2-8 rakaat.',
    Dzuhur: '🌞 *WAKTU DZUHUR*\n\n> Hai Sahabat, waktu Sholat Dzuhur telah tiba.\n> Ambilah air wudhu dan segeralah sholat.',
    Ashar: '🌇 *WAKTU ASHAR*\n\n> Hai Sahabat, waktu Sholat Ashar telah tiba.\n> Ambilah air wudhu dan segeralah sholat.',
    Maghrib: '🌆 *WAKTU MAGHRIB*\n\n> Hai Sahabat, waktu Sholat Maghrib telah tiba.\n> Ambilah air wudhu dan segeralah sholat.',
    Isya: '🌙 *WAKTU ISYA*\n\n> Hai Sahabat, waktu Sholat Isya telah tiba.\n> Ambilah air wudhu dan segeralah sholat.'
}

const GAMBAR_SUASANA = {
    Imsak: 'https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif',
    Subuh: 'https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif',
    Terbit: 'https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif',
    Dhuha: 'https://cdn.gimita.id/download/images_1769502277606_04d594fe.jfif',
    Dzuhur: 'https://cdn.gimita.id/download/qf2d6868_sheikh-zayed-grand-mosque_625x300_04_March_25_1769502237718_92212561.webp',
    Ashar: 'https://cdn.gimita.id/download/18537d69-a2e0-4dc2-a144-57dde0f359b5_1769502389063_5c004902.jpg',
    Maghrib: 'https://cdn.gimita.id/download/mosque-5950407_1280_1769502206553_660ae15c.webp',
    Isya: 'https://cdn.gimita.id/download/pngtree-nighttime-mosque-illustration-with-realistic-details-celebrating-ramadan-kareem-mubarak-image_3814083_1769502091988_e4cf3326.jpg'
}

const AUDIO_ADZAN = 'https://media.vocaroo.com/mp3/1ofLT2YUJAjQ'

let lastNotifiedTime = ''
let sholatInterval = null
let sock = null

function initSholatScheduler(socketInstance) {
    sock = socketInstance
    
    if (sholatInterval) {
        clearInterval(sholatInterval)
    }
    
    sholatInterval = setInterval(checkSholatTime, 30000)
    logger.info('SholatScheduler', 'Prayer time scheduler started')
}

function getCurrentTimeWIB() {
    const timeHelper = require('./timeHelper')
    return timeHelper.getCurrentTimeString()
}

async function checkSholatTime() {
    if (!sock) return
    
    const db = getDatabase()
    const globalEnabled = db.setting('autoSholat')
    
    if (!globalEnabled) return
    
    const currentTime = getCurrentTimeWIB()
    
    if (currentTime === lastNotifiedTime) return
    
    for (const [sholat, waktu] of Object.entries(JADWAL_SHOLAT)) {
        if (currentTime === waktu) {
            lastNotifiedTime = currentTime
            await sendSholatNotifications(sholat, waktu)
            
            setTimeout(() => {
                lastNotifiedTime = ''
            }, 60000)
            
            break
        }
    }
}

async function sendSholatNotifications(sholat, waktu) {
    try {
        const db = getDatabase()
        
        const closeGroup = db.setting('autoSholatCloseGroup') || false
        const duration = db.setting('autoSholatDuration') || 5
        const sendAudio = db.setting('autoSholatAudio') !== false
        
        const saluranId = config.saluran?.id || '120363175366250567@newsletterp'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        let groupList = []
        try {
            const groupsObj = await sock.groupFetchAllParticipating()
            groupList = Object.keys(groupsObj)
        } catch (e) {
            logger.error('SholatScheduler', `Failed to fetch groups: ${e.message}`)
            return
        }
        
        if (groupList.length === 0) {
            logger.info('SholatScheduler', 'No groups to send notifications')
            return
        }
        
        let sentCount = 0
        const closedGroups = []
        
        const isSholatTime = ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'].includes(sholat)
        
        let message = `${SHOLAT_MESSAGES[sholat]}\n\n⏰ *${waktu} WIB*`
        
        if (closeGroup && isSholatTime) {
            message += `\n\n> 🔒 _Grup ditutup ${duration} menit untuk sholat_`
        }
        
        for (const groupId of groupList) {
            const groupData = db.data?.groups?.[groupId] || {}
            if (groupData.notifSholat === false) continue
            
            try {
                if (sendAudio && isSholatTime) {
                    await sock.sendMessage(groupId, {
                        audio: { url: AUDIO_ADZAN },
                        mimetype: 'audio/mpeg',
                        ptt: false,
                        contextInfo: {
                            externalAdReply: {
                                title: `🕌 Waktu ${sholat} ,Telah tiba`,
                                body: `Bagi yang muslim, dimohon untuk menunaikan sholat terlebih dahulu`,
                                thumbnailUrl: GAMBAR_SUASANA[sholat],
                                sourceUrl: 'https://waktunya.ibadah',
                                mediaType: 1,
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
                } else {
                    await sock.sendMessage(groupId, {
                        text: message,
                        contextInfo: {
                            externalAdReply: {
                                title: `🕌 Waktu ${sholat}`,
                                body: `${waktu} WIB`,
                                thumbnailUrl: GAMBAR_SUASANA[sholat],
                                sourceUrl: config.saluran?.link || 'https://waktunya.ibadah',
                                mediaType: 1,
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
                }
                
                if (closeGroup && isSholatTime) {
                    try {
                        await sock.groupSettingUpdate(groupId, 'announcement')
                        closedGroups.push(groupId)
                    } catch (e) {
                        logger.error('SholatScheduler', `Failed to close ${groupId}: ${e.message}`)
                    }
                }
                
                sentCount++
                
                await new Promise(r => setTimeout(r, 500))
            } catch (err) {
                logger.error('SholatScheduler', `Failed to send to ${groupId}: ${err.message}`)
            }
        }
        
        if (closeGroup && closedGroups.length > 0) {
            setTimeout(async () => {
                for (const groupId of closedGroups) {
                    try {
                        await sock.groupSettingUpdate(groupId, 'not_announcement')
                        await sock.sendMessage(groupId, {
                            text: `✅ Grup dibuka kembali setelah sholat ${sholat}.\n\n> Semoga sholat kita diterima. Aamiin 🤲`,
                            contextInfo: {
                                forwardingScore: 9999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid: saluranId,
                                    newsletterName: saluranName,
                                    serverMessageId: 127
                                }
                            }
                        })
                        await new Promise(r => setTimeout(r, 600))
                    } catch (e) {
                        logger.error('SholatScheduler', `Failed to open ${groupId}: ${e.message}`)
                    }
                }
                logger.info('SholatScheduler', `Opened ${closedGroups.length} groups after ${sholat}`)
            }, duration * 60 * 1000)
        }
        
        if (sentCount > 0) {
            logger.info('SholatScheduler', `Sent ${sholat} notification to ${sentCount} groups` + (closedGroups.length > 0 ? ` (${closedGroups.length} closed)` : ''))
        }
        
    } catch (error) {
        logger.error('SholatScheduler', `Error: ${error.message}`)
    }
}

function stopSholatScheduler() {
    if (sholatInterval) {
        clearInterval(sholatInterval)
        sholatInterval = null
        logger.info('SholatScheduler', 'Prayer time scheduler stopped')
    }
}

module.exports = {
    initSholatScheduler,
    stopSholatScheduler,
    JADWAL_SHOLAT,
    SHOLAT_MESSAGES,
    GAMBAR_SUASANA,
    AUDIO_ADZAN
}
