require('../config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, proto } = require("@whiskeysockets/baileys")
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')

// --- LOAD LIBRARY (DENGAN PATH YANG BENAR) ---
const srcLibPath = path.join(__dirname, 'lib')
const rootLibPath = path.join(__dirname, '../lib')

let functions;
try {
    functions = require(path.join(srcLibPath, 'functions'))
} catch (e) {
    functions = {} 
}

let simple;
try {
    simple = require(path.join(rootLibPath, 'simple'))
} catch (e) {
    simple = {}
}

let color;
try {
    const colorLib = require(path.join(srcLibPath, 'colors'))
    color = colorLib.color
} catch (e) {
    color = (text) => text 
}

const smsg = simple.smsg || functions.smsg
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = functions
// ---------------------------------------------

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

// PERBAIKAN: Ubah nama fungsi jadi startConnection agar sesuai dengan index.js
async function startConnection() {
    const sessionPath = path.join(__dirname, '../session')
    
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true })
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`)

    const ourin = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['Ourin Bot', 'Safari', '1.0.0'],
        auth: state,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id)
                return msg.message || undefined
            }
            return {
                conversation: 'Hello, this is Ourin Bot!'
            }
        }
    })

    store.bind(ourin.ev)

    ourin.ev.on('messages.upsert', async chatUpdate => {
        try {
            mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            if (!ourin.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            
            if (smsg) {
                m = smsg(ourin, mek, store)
            } else {
                m = mek
            }

            const casePath = path.join(__dirname, '../case/ourin')
            require(casePath)(ourin, m, chatUpdate, store)
        } catch (err) {
            console.log("Error in upsert:", err)
        }
    })

    ourin.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); process.exit(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); startConnection(); }
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); startConnection(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); process.exit(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Delete Session and Scan Again.`); process.exit(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); startConnection(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); startConnection(); }
            else { console.log(`Unknown DisconnectReason: ${reason}|${connection}`); startConnection(); }
        } else if (connection === 'open') {
            console.log('Bot Connected to WhatsApp!')
        }
    })

    ourin.ev.on('creds.update', saveCreds)
    return ourin
}

// PERBAIKAN: Export dengan nama yang konsisten
module.exports = startConnection