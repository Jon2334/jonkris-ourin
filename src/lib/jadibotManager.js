const QRCode = require('qrcode')
const path = require('path')
const fs = require('fs')
const { delay, DisconnectReason, jidNormalizedUser, useMultiFileAuthState } = require('ourin')
const { logger } = require('./colors')

const JADIBOT_AUTH_FOLDER = path.join(process.cwd(), 'session', 'jadibot')
const jadibotSessions = new Map()

if (!fs.existsSync(JADIBOT_AUTH_FOLDER)) {
    fs.mkdirSync(JADIBOT_AUTH_FOLDER, { recursive: true })
}

const captionPairing = `
🤖 *ᴊᴀᴅɪʙᴏᴛ - ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ*

Kode Pairing kamu:
\`%code\`

> Masukkan kode ini di WhatsApp kamu
> Settings > Linked Devices > Link a Device
`.trim()

const captionQR = `
🤖 *ᴊᴀᴅɪʙᴏᴛ - Qʀ ᴄᴏᴅᴇ*

Scan kode QR ini untuk menjadi bot.
Expired dalam %time detik.

> QR Count: %count/3
`.trim()

function getJadibotAuthPath(jid) {
    const id = jid.replace(/@.+/g, '')
    return path.join(JADIBOT_AUTH_FOLDER, id)
}

function isJadibotActive(jid) {
    const id = jid.replace(/@.+/g, '')
    return jadibotSessions.has(id)
}

function getActiveJadibots() {
    return Array.from(jadibotSessions.entries()).map(([id, data]) => ({
        id,
        jid: id + '@s.whatsapp.net',
        ...data
    }))
}

function getAllJadibotSessions() {
    const sessions = []
    if (!fs.existsSync(JADIBOT_AUTH_FOLDER)) return sessions
    
    const dirs = fs.readdirSync(JADIBOT_AUTH_FOLDER)
    for (const dir of dirs) {
        const credsPath = path.join(JADIBOT_AUTH_FOLDER, dir, 'creds.json')
        if (fs.existsSync(credsPath)) {
            sessions.push({
                id: dir,
                jid: dir + '@s.whatsapp.net',
                isActive: jadibotSessions.has(dir),
                credsPath
            })
        }
    }
    return sessions
}

const rateLimit = new Map()

async function startJadibot(sock, m, userJid, usePairing = true) {
    if (!userJid || typeof userJid !== 'string' || !userJid.includes('@s.whatsapp.net')) {
        throw new Error('Invalid User JID')
    }

    const id = userJid.replace(/@.+/g, '')
    
    // Rate Limit: 1 attempt per 60s
    if (usePairing) {
        const lastAttempt = rateLimit.get(id) || 0
        if (Date.now() - lastAttempt < 60000) {
            throw new Error('Please wait 1 minute before trying again.')
        }
        rateLimit.set(id, Date.now())
    }

    const authPath = getJadibotAuthPath(userJid)
    
    if (jadibotSessions.has(id)) {
        throw new Error('Jadibot sudah aktif untuk nomor ini!')
    }
    
    const { state, saveCreds } = await useMultiFileAuthState(authPath)
    
    const { default: makeWASocket, fetchLatestBaileysVersion } = require('ourin')
    const { version } = await fetchLatestBaileysVersion()
    
    const childSock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '1.0.0'],
        logger: require('pino')({ level: 'silent' }),
        generateHighQualityLinkPreview: true
    })
    
    let qrCount = 0
    let lastQRMsg = null
    let pairingCode = null
    
    if (usePairing && !state.creds?.registered) {
        await delay(2000)
        try {
            pairingCode = await childSock.requestPairingCode(id)
            pairingCode = pairingCode.match(/.{1,4}/g)?.join('-') || pairingCode
            
            if (m && m.chat) {
                await sock.sendMessage(m.chat, {
                    text: captionPairing.replace(/%code/g, pairingCode)
                }, { quoted: m })
            } else {
                 logger.info('Jadibot', `Pairing Code for ${id}: ${pairingCode}`)
            }
        } catch (e) {
            logger.error('Jadibot', 'Failed to get pairing code: ' + e.message)
            throw new Error('Gagal mendapatkan pairing code: ' + e.message)
        }
    }
    
    childSock.ev.on('creds.update', saveCreds)
    
    childSock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr, isNewLogin } = update
        
        if (qr && !usePairing) {
            qrCount++
            if (qrCount > 3) {
                await sock.sendMessage(m.chat, { text: '❌ QR Code expired! Silakan coba lagi.' })
                if (lastQRMsg?.key) {
                    await sock.sendMessage(m.chat, { delete: lastQRMsg.key })
                }
                jadibotSessions.delete(id)
                try { childSock.ws.close() } catch {}
                return
            }
            
            try {
                const qrBuffer = await QRCode.toBuffer(qr, {
                    scale: 8,
                    margin: 4,
                    width: 256,
                    color: { dark: '#000000ff', light: '#ffffffff' }
                })
                
                if (lastQRMsg?.key) {
                    await sock.sendMessage(m.chat, { delete: lastQRMsg.key })
                }
                
                lastQRMsg = await sock.sendMessage(m.chat, {
                    image: qrBuffer,
                    caption: captionQR
                        .replace(/%time/g, '20')
                        .replace(/%count/g, qrCount)
                }, { quoted: m })
            } catch (e) {
                logger.error('Jadibot', 'Failed to send QR: ' + e.message)
            }
        }
        
        if (connection === 'open') {
            logger.info('Jadibot', `Connected: ${id}`)
            
            jadibotSessions.set(id, {
                sock: childSock,
                jid: childSock.user?.jid || userJid,
                startedAt: Date.now(),
                ownerJid: m.sender
            })
            
            await sock.sendMessage(m.chat, {
                text: `✅ *ᴊᴀᴅɪʙᴏᴛ ʙᴇʀʜᴀsɪʟ!*\n\n` +
                    `> Nomor: @${id}\n` +
                    `> Status: *Aktif*\n\n` +
                    `> Bot kamu sekarang aktif!`,
                mentions: [userJid]
            }, { quoted: m })
            
            if (lastQRMsg?.key) {
                await sock.sendMessage(m.chat, { delete: lastQRMsg.key })
            }
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const errorMessage = lastDisconnect?.error?.message || 'Unknown error'
            
            const fatalCodes = [401, 403, 405, 406, 409, 411, 428, 500, 501, 503]
            const isFatalError = fatalCodes.includes(statusCode)
            const shouldReconnect = !isFatalError && 
                statusCode !== DisconnectReason.loggedOut && 
                statusCode !== DisconnectReason.forbidden
            
            const errorReasons = {
                401: 'Nomor tidak terdaftar WhatsApp',
                403: 'Akses ditolak/dibanned',
                405: 'Metode tidak diizinkan',
                406: 'Nomor dibatasi',
                409: 'Konflik session',
                411: 'Autentikasi gagal',
                428: 'Rate limit (terlalu banyak permintaan)',
                500: 'Server error',
                501: 'Tidak diimplementasi',
                503: 'Layanan tidak tersedia',
                515: 'Stream error (session corrupt)'
            }
            
            const reason = errorReasons[statusCode] || errorMessage
            logger.info('Jadibot', `Disconnected: ${id}, code: ${statusCode}, reason: ${reason}`)
            
            if (isFatalError || !shouldReconnect) {
                jadibotSessions.delete(id)
                try {
                    if (fs.existsSync(authPath)) {
                        fs.rmSync(authPath, { recursive: true, force: true })
                    }
                } catch {}
                
                try {
                    await sock.sendMessage(m.chat, {
                        text: `❌ *ᴊᴀᴅɪʙᴏᴛ ᴅɪsᴄᴏɴɴᴇᴄᴛᴇᴅ*\n\n` +
                            `> Nomor: @${id}\n` +
                            `> Code: ${statusCode}\n` +
                            `> Reason: ${reason}\n\n` +
                            `> Session telah dihapus otomatis.`,
                        mentions: [userJid]
                    })
                } catch {}
            } else {
                startJadibot(sock, m, userJid, false).catch(() => {
                    jadibotSessions.delete(id)
                })
            }
        }
    })
    
    const processedMessages = new Map()
    
    childSock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (!childSock.user || !childSock.user.id) {
            childSock.user = { 
                id: jidNormalizedUser(id), 
                name: 'Jadibot' 
            }
        }

        if (type !== 'notify') return
        
        try {
            const { messageHandler } = require('../handler')
            for (const msg of messages) {
                if (!msg.message) continue
                const msgId = msg.key?.id
                if (msgId && processedMessages.has(msgId)) continue
                if (msgId) processedMessages.set(msgId, Date.now())
                if (msg.key?.fromMe) continue
                if (msg.key && msg.key.remoteJid === 'status@broadcast') continue
                
                const msgTimestamp = msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now()
                const now = Date.now()
                const msgAge = now - msgTimestamp
                
                if (msgAge > 60 * 60 * 1000) continue // Skip > 1 hour
                
                const msgType = Object.keys(msg.message)[0]
                const ignoredTypes = [
                    "protocolMessage", "senderKeyDistributionMessage", "reactionMessage",
                    "stickerSyncRmrMessage", "encReactionMessage", "pollUpdateMessage",
                    "keepInChatMessage"
                ]
                
                if (ignoredTypes.includes(msgType)) continue
                await messageHandler(msg, childSock, { isJadibot: true, jadibotId: id })
            }
            const fiveMinAgo = Date.now() - 300000
            for (const [key, time] of processedMessages) {
                if (time < fiveMinAgo) processedMessages.delete(key)
            }
        } catch (e) {
            console.error(`[Jadibot ${id}] Handler Error:`, e)
            logger.error('Jadibot', `Handler error: ${e.message}`)
        }
    })
    
    return { sock: childSock, pairingCode }
}

async function stopJadibot(jid, deleteSession = false) {
    const id = jid.replace(/@.+/g, '')
    const session = jadibotSessions.get(id)
    
    if (session) {
        try {
            session.sock.ws.close()
            session.sock.ev.removeAllListeners()
        } catch {}
        jadibotSessions.delete(id)
    }
    
    if (deleteSession) {
        const authPath = getJadibotAuthPath(jid)
        if (fs.existsSync(authPath)) {
            fs.rmSync(authPath, { recursive: true, force: true })
        }
    }
    
    return true
}

async function stopAllJadibots() {
    const stopped = []
    for (const [id, session] of jadibotSessions) {
        try {
            session.sock.ws.close()
            session.sock.ev.removeAllListeners()
        } catch {}
        stopped.push(id)
    }
    jadibotSessions.clear()
    return stopped
}

async function restartJadibotSession(sock, sessionId) {
    const userJid = sessionId + '@s.whatsapp.net'
    try {
        logger.info('Jadibot', `Restoring session: ${sessionId}`)
        const mockM = { 
            chat: userJid, 
            sender: userJid,
            key: { 
                remoteJid: userJid, 
                fromMe: false, 
                id: 'restart-' + Date.now() 
            }
        } 
        await startJadibot(sock, mockM, userJid, false) // usePairing=false for re-auth
    } catch (e) {
        logger.error('Jadibot', `Failed to restore ${sessionId}: ${e.message}`)
    }
}

module.exports = {
    JADIBOT_AUTH_FOLDER,
    jadibotSessions,
    getJadibotAuthPath,
    isJadibotActive,
    getActiveJadibots,
    getAllJadibotSessions,
    startJadibot,
    stopJadibot,
    stopAllJadibots,
    restartJadibotSession
}
