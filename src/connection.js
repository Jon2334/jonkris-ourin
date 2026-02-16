const Baileys = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { logger, logConnection, logErrorBox } = require("./lib/colors");

// -- IMPORTS & DEFINITIONS --
const makeWASocket = Baileys.default;
const {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    jidDecode,
    delay
} = Baileys;

// Coba ambil makeInMemoryStore dari berbagai sumber export
const makeInMemoryStore = Baileys.makeInMemoryStore || Baileys.default?.makeInMemoryStore || Baileys.default?.default?.makeInMemoryStore;

// -- SETUP RETRY CACHE (SOLUSI BAD MAC) --
// Cache sederhana untuk menangani retry pesan yang gagal didekripsi
const retryMap = new Map();
const msgRetryCounterCache = {
    get: (key) => retryMap.get(key),
    set: (key, value) => retryMap.set(key, value),
    del: (key) => retryMap.delete(key),
    flushAll: () => retryMap.clear()
};

// -- SETUP STORE (SAFE MODE) --
let store = null;
try {
    if (typeof makeInMemoryStore === 'function') {
        store = makeInMemoryStore({ 
            logger: pino().child({ level: "silent", stream: "store" }) 
        });
    } else {
        // Silent warning agar log tidak penuh
        // logger.warn("System", "Store inactive (Function not found)");
    }
} catch (e) {
    // logger.warn("System", "Store failed to init");
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
        printQRInTerminal: false,
        auth: state,
        browser: ["Ourin-AI", "Ubuntu", "3.0.0"],
        generateHighQualityLinkPreview: true,
        msgRetryCounterCache, // PENTING: Untuk fix Bad MAC / Decryption Fail
        defaultQueryTimeoutMs: undefined, // Mencegah timeout query prematur
        keepAliveIntervalMs: 30000, // Keep alive interval
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
            qrcode.generate(qr, { small: true });
        }

        if (onConnectionUpdate) await onConnectionUpdate(update, sock);

        if (connection === "close") {
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const errorMsg = lastDisconnect?.error?.message || "";

            // Deteksi konflik sesi
            if (errorMsg.includes('conflict')) {
                reason = DisconnectReason.connectionReplaced;
            }

            // Filter log agar tidak terlalu panik
            if (reason !== DisconnectReason.loggedOut) {
                logger.info("Connection", `Disconnected (${reason}). Reconnecting...`);
            } else {
                logConnection("disconnected", `Reason: ${reason}`);
            }
            
            // Logika Reconnect
            if (reason === DisconnectReason.loggedOut) {
                logErrorBox("Connection", "Device Logged Out. Please delete session folder and scan again.");
            } else if (reason === DisconnectReason.connectionReplaced) {
                logger.warn("Connection", "Session Conflict. Waiting 5s...");
                await delay(5000); 
                startConnection(callbacks);
            } else if (reason === DisconnectReason.restartRequired) {
                startConnection(callbacks);
            } else {
                // Jeda sedikit untuk error umum
                await delay(3000);
                startConnection(callbacks);
            }
        } else if (connection === "open") {
            logConnection("connected", sock.user?.id || "Bot");
        }
    });

    // Menyimpan kredensial saat ada perubahan
    sock.ev.on("creds.update", saveCreds);

    // Handler Pesan Masuk
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message) return;
            if (onRawMessage) await onRawMessage(m, sock);
            if (onMessage) await onMessage(m, sock);
        } catch (err) {
            // Ignore
        }
    });

    // Handler Update Pesan
    sock.ev.on("messages.update", async (updates) => {
        if (onMessageUpdate) await onMessageUpdate(updates, sock);
    });

    // Handler Group Participants
    sock.ev.on("group-participants.update", async (update) => {
        if (onGroupUpdate) await onGroupUpdate(update, sock);
    });

    // Handler Group Settings
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