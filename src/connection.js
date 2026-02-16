const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
    jidDecode,
    getContentType
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
const path = require("path");
const { logger, logConnection, logErrorBox } = require("./lib/colors");

// Menyiapkan penyimpanan pesan sementara di memori
const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });

/**
 * Fungsi utama untuk mengelola koneksi WhatsApp
 */
async function startConnection(callbacks = {}) {
    const { onMessage, onGroupUpdate, onMessageUpdate, onGroupSettingsUpdate, onConnectionUpdate, onRawMessage } = callbacks;
    
    // Mengelola folder sesi (auth)
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "../session"));
    const { version, isLatest } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: true,
        auth: state,
        browser: ["Ourin-AI", "Safari", "1.0.0"],
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: "Hello, I'm Ourin-AI" };
        }
    });

    store.bind(sock.ev);

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
                logErrorBox("Connection", "Disconnected. Please scan QR again.");
            }
        } else if (connection === "open") {
            logConnection("connected", sock.user.id);
        }
    });

    // Menyimpan kredensial saat ada perubahan (untuk login)
    sock.ev.on("creds.update", saveCreds);

    // Handler Pesan Masuk
    sock.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0];
            if (!m.message) return;
            
            // Raw message callback (digunakan untuk Anti-Tag SW dll)
            if (onRawMessage) await onRawMessage(m, sock);
            
            // Format pesan agar lebih mudah dibaca oleh handler
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

// EKSPOR: Sangat penting agar index.js bisa membaca fungsi ini
module.exports = { startConnection };