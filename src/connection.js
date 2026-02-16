const Baileys = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const { logger, logConnection, logErrorBox } = require("./lib/colors");

// -- IMPORTS YANG LEBIH AMAN --
// Kita ambil fungsi dari objek utama Baileys untuk menghindari error destructuring
const makeWASocket = Baileys.default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    makeInMemoryStore // Coba ambil dari sini dulu
} = Baileys;

// -- SETUP STORE (SAFE MODE) --
// Kita cek apakah makeInMemoryStore itu ada dan berupa fungsi.
// Jika tidak (error yang kamu alami), kita set store menjadi null agar bot tidak crash.
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
        printQRInTerminal: true,
        auth: state,
        browser: ["Ourin-AI", "Safari", "1.0.0"], // Browser diset ke Safari agar lebih stabil
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
            // Fallback jika store tidak aktif
            return { conversation: "Hello, I'm Ourin-AI" };
        }
    });

    // Hanya bind store jika store berhasil diinisialisasi
    if (store) {
        store.bind(sock.ev);
    }

    // Update Koneksi
    sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (onConnectionUpdate) await onConnectionUpdate(update, sock);

        if (connection === "close") {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            logConnection("disconnected", `Reason: ${lastDisconnect.error}`);
            
            if (shouldReconnect) {
                logger.info("Connection", "Reconnecting...");
                startConnection(callbacks);
            } else {
                logErrorBox("Connection", "Disconnected. Please scan QR again (delete session folder).");
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
            
            // Raw message callback
            if (onRawMessage) await onRawMessage(m, sock);
            
            // Handler utama
            if (onMessage) await onMessage(m, sock);
        } catch (err) {
            logger.error("Connection Upsert", err.message);
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

    /**
     * Utilitas tambahan untuk decode JID
     */
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
        } else return jid;
    };

    return sock;
}

// EKSPOR: Penting!
module.exports = { startConnection };