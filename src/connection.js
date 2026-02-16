const Baileys = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal"); // Wajib install: npm i qrcode-terminal
const { logger, logConnection, logErrorBox } = require("./lib/colors");

// -- IMPORTS YANG LEBIH AMAN --
const makeWASocket = Baileys.default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    makeInMemoryStore,
    delay // Tambahkan delay untuk mencegah spam reconnect
} = Baileys;

// -- SETUP STORE (SAFE MODE) --
let store = null;
try {
    if (typeof makeInMemoryStore === 'function') {
        store = makeInMemoryStore({ 
            logger: pino().child({ level: "silent", stream: "store" }) 
        });
    } else {
        logger.warn("System", "makeInMemoryStore is not a function. Running without store.");
    }
} catch (e) {
    logger.warn("System", "Failed to initialize store. Running without store.");
}

/**
 * Fungsi utama untuk mengelola koneksi WhatsApp
 */
async function startConnection(callbacks = {}) {
    const { onMessage, onGroupUpdate, onMessageUpdate, onGroupSettingsUpdate, onConnectionUpdate, onRawMessage } = callbacks;
    
    // Pastikan folder session ada
    const sessionDir = path.join(__dirname, "../session");
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Mengelola folder sesi (auth)
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false, // Kita handle manual agar muncul di Heroku
        auth: state,
        browser: ["Ourin-AI", "Ubuntu", "3.0.0"],
        generateHighQualityLinkPreview: true,
        // Fungsi getMessage dimodifikasi agar tidak error jika store mati
        getMessage: async (key) => {
            if (store) {
                try {
                    const msg = await store.loadMessage(key.remoteJid, key.id);
                    return msg?.message || undefined;
                } catch (e) {
                    return null;
                }
            }
            return { conversation: "Hello, I'm Ourin-AI" };
        }
    });

    // Hanya bind store jika store berhasil diinisialisasi
    if (store) {
        store.bind(sock.ev);
    }

    // Update Koneksi
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        // -- MANUAL QR PRINT --
        if (qr) {
            console.log("\n");
            logger.info("Connection", "Please scan the QR Code below:");
            qrcode.generate(qr, { small: true }); // Tampilkan QR di terminal
        }

        if (onConnectionUpdate) await onConnectionUpdate(update, sock);

        if (connection === "close") {
            // Analisa alasan putus koneksi
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            
            // Cek jika errornya adalah konflik (biasanya string 'Stream Errored (conflict)')
            if (lastDisconnect?.error?.message?.includes('conflict')) {
                reason = DisconnectReason.connectionReplaced;
            }

            logConnection("disconnected", `Reason: ${lastDisconnect?.error?.message || reason}`);
            
            // Logika Reconnect yang Lebih Aman
            if (reason === DisconnectReason.loggedOut) {
                logErrorBox("Connection", "Device Logged Out. Please delete session folder and scan again.");
                // Jangan reconnect otomatis jika logout
            } else if (reason === DisconnectReason.connectionReplaced) {
                // Jika konflik, tunggu lebih lama (5 detik) agar sesi lama mati dulu
                logger.warn("Connection", "Connection Replaced (Conflict). Waiting 5s before reconnecting...");
                await delay(5000); 
                startConnection(callbacks);
            } else if (reason === DisconnectReason.restartRequired) {
                logger.info("Connection", "Restart Required. Restarting...");
                startConnection(callbacks);
            } else if (reason === DisconnectReason.timedOut) {
                logger.info("Connection", "Timed Out. Reconnecting...");
                startConnection(callbacks);
            } else {
                // Untuk error lain (Stream Errored, dll), beri jeda 3 detik biar gak spam
                logger.info("Connection", "Reconnecting in 3s...");
                await delay(3000);
                startConnection(callbacks);
            }
        } else if (connection === "open") {
            logConnection("connected", sock.user?.id || "Bot");
        }
    });

    // Menyimpan kredensial saat ada perubahan (untuk login)
    sock.ev.on("creds.update", saveCreds);

    // Handler Pesan Masuk
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message) return;
            if (onRawMessage) await onRawMessage(m, sock);
            if (onMessage) await onMessage(m, sock);
        } catch (err) {
            // Ignore trivial errors
        }
    });

    // Handler Update Pesan (Edit/Delete)
    sock.ev.on("messages.update", async (updates) => {
        if (onMessageUpdate) await onMessageUpdate(updates, sock);
    });

    // Handler Update Grup (Welcome/Left)
    sock.ev.on("group-participants.update", async (update) => {
        if (onGroupUpdate) await onGroupUpdate(update, sock);
    });

    // Handler Update Pengaturan Grup (Mute/Open/Close)
    sock.ev.on("groups.update", async (update) => {
        if (onGroupSettingsUpdate) await onGroupSettingsUpdate(update, sock);
    });

    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
        } else return jid;
    };

    return sock;
}

module.exports = { startConnection };