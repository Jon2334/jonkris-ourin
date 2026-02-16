require('../config')
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeInMemoryStore, jidDecode, proto } = require("@whiskeysockets/baileys")
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')

// --- BAGIAN INI SANGAT PENTING (JANGAN DIUBAH) ---

// 1. Tentukan path ke folder library
const srcLibPath = path.join(__dirname, 'lib')      // Folder: /src/lib/
const rootLibPath = path.join(__dirname, '../lib')  // Folder: /lib/ (di root)

// 2. Load Functions dari 'src/lib/functions.js' (Pengganti myfunc)
// Kita gunakan try-catch untuk debugging jika file tidak ditemukan
let functions;
try {
    functions = require(path.join(srcLibPath, 'functions'))
} catch (e) {
    console.error("Gagal load src/lib/functions.js:", e)
    functions = {} // Fallback object kosong agar tidak crash instan
}

// 3. Load Simple dari 'lib/simple.js' (Untuk fungsi smsg)
let simple;
try {
    simple = require(path.join(rootLibPath, 'simple'))
} catch (e) {
    console.error("Gagal load lib/simple.js:", e)
    simple = {}
}

// 4. Load Colors dari 'src/lib/colors.js'
let color;
try {
    const colorLib = require(path.join(srcLibPath, 'colors'))
    color = colorLib.color
} catch (e) {
    color = (text) => text // Fallback jika gagal load warna
}

// 5. Destructuring fungsi-fungsi penting
// Kita ambil smsg dari simple.js, jika tidak ada ambil dari functions.js
const smsg = simple.smsg || functions.smsg
const { isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = functions
// ----------------------------------------------------

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

async function startOurin() {
    // Path session diarahkan ke root folder agar rapi
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
            
            // Panggil smsg (pastikan fungsi ini ada)
            if (smsg) {
                m = smsg(ourin, mek, store)
            } else {
                m = mek // Fallback jika smsg gagal diload
            }

            // Path ke handler case/ourin.js
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
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); startOurin(); }
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); startOurin(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); process.exit(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Delete Session and Scan Again.`); process.exit(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); startOurin(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); startOurin(); }
            else { console.log(`Unknown DisconnectReason: ${reason}|${connection}`); startOurin(); }
        } else if (connection === 'open') {
            console.log('Bot Connected to WhatsApp!')
        }
    })

    ourin.ev.on('creds.update', saveCreds)
    return ourin
}

startOurin()

module.exports = startOurin