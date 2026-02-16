const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeInMemoryStore, 
    jidDecode,
    delay 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const { logger } = require("./colors");

// --- IMPORT MONGO AUTH ---
// Kita coba load modul mongoAuth, jika file belum dibuat user, jangan crash
let useMongoDBAuthState = null;
try {
    useMongoDBAuthState = require('./mongoAuth').useMongoDBAuthState;
} catch (e) {
    // Abaikan jika user belum membuat file mongoAuth.js
}

// --- SETUP STORE (SAFE MODE) ---
let jadibotStore = null;
try {
    if (typeof makeInMemoryStore === 'function') {
        jadibotStore = makeInMemoryStore({ 
            logger: pino().child({ level: 'silent', stream: 'store' }) 
        });
    }
} catch (e) {}

const jadibots = new Map();

/**
 * Mendapatkan daftar semua sesi jadibot
 * Mendukung File System & MongoDB (jika diimplementasikan list-nya)
 */
const getAllJadibotSessions = async () => {
    // 1. Cek Folder Lokal
    const sessionPath = path.join(__dirname, "../../session-jadibot");
    let localSessions = [];
    if (fs.existsSync(sessionPath)) {
        try {
            localSessions = fs.readdirSync(sessionPath)
                .filter(file => fs.statSync(path.join(sessionPath, file)).isDirectory())
                .map(id => ({ id }));
        } catch {}
    }

    // 2. Cek MongoDB (Jika aktif)
    // Note: Untuk MongoDB, kita perlu query distinct sessionId
    // Ini implementasi sederhana: Kita kembalikan yang lokal dulu untuk stabilitas,
    // atau user bisa menambahkan logika query MongoDB disini nanti.
    
    return localSessions; 
};

const getActiveJadibots = () => {
    const active = [];
    for (const [id, _] of jadibots) {
        active.push({ id });
    }
    return active;
};

const restartJadibotSession = async (mainSock, id) => {
    return startJadibot(mainSock, id, true);
};

/**
 * Fungsi utama memulai sesi Jadibot
 * Support Hybrid: MongoDB (Prioritas) atau File System
 */
const startJadibot = async (mainSock, userId, isRestart = false) => {
    try {
        let state, saveCreds;

        // --- LOGIKA PEMILIHAN PENYIMPANAN ---
        if (process.env.MONGODB_URI && useMongoDBAuthState) {
            // Gunakan MongoDB jika URI tersedia
            logger.info(`Jadibot ${userId}`, "Using MongoDB Session");
            const auth = await useMongoDBAuthState(`jadibot-${userId}`);
            state = auth.state;
            saveCreds = auth.saveCreds;
        } else {
            // Fallback ke File Lokal (Lama)
            logger.info(`Jadibot ${userId}`, "Using Local File Session");
            const sessionDir = path.join(__dirname, "../../session-jadibot", userId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            const auth = await useMultiFileAuthState(sessionDir);
            state = auth.state;
            saveCreds = auth.saveCreds;
        }

        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false,
            auth: state,
            browser: ["Jadibot", "Chrome", "1.0.0"],
            markOnlineOnConnect: true,
            generateHighQualityLinkPreview: true,
            getMessage: async (key) => {
                if (jadibotStore) {
                    try {
                        const msg = await jadibotStore.loadMessage(key.remoteJid, key.id);
                        return msg?.message || undefined;
                    } catch { return null; }
                }
                return { conversation: "Jadibot Active" };
            }
        });

        if (jadibotStore) jadibotStore.bind(sock.ev);
        jadibots.set(userId, sock);

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr && !isRestart) {
                try {
                    const qrBuffer = await QRCode.toBuffer(qr, { scale: 8 });
                    await mainSock.sendMessage(userId + "@s.whatsapp.net", {
                        image: qrBuffer,
                        caption: "Scan QR Code ini untuk menjadi Jadibot.\nKode kadaluarsa dalam 30 detik."
                    });
                } catch (err) {
                    logger.error(`Jadibot ${userId}`, "Failed to send QR");
                }
            }

            if (connection === "open") {
                logger.success(`Jadibot ${userId}`, "Connected");
                try {
                    await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                        text: "✅ Jadibot berhasil terhubung!\nSesi tersimpan aman di database." 
                    });
                } catch {}
            }

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                jadibots.delete(userId);

                if (reason === DisconnectReason.loggedOut) {
                    logger.warn(`Jadibot ${userId}`, "Logged out");
                    stopJadibot(userId); 
                    try {
                        await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                            text: "❌ Sesi Jadibot terputus (Logout)." 
                        });
                    } catch {}
                } else {
                    logger.info(`Jadibot ${userId}`, "Reconnecting...");
                    await delay(3000);
                    startJadibot(mainSock, userId, true);
                }
            }
        });

        sock.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const handlerModule = require("../handler");
                if (handlerModule && handlerModule.messageHandler) {
                    const m = chatUpdate.messages[0];
                    if (!m.message) return;
                    
                    await handlerModule.messageHandler(m, sock, { 
                        isJadibot: true, 
                        jadibotId: userId 
                    });
                }
            } catch (err) {}
        });

    } catch (err) {
        logger.error(`Jadibot ${userId}`, `Start Error: ${err.message}`);
    }
};

const stopJadibot = (userId) => {
    const sock = jadibots.get(userId);
    if (sock) {
        try { sock.end(undefined); } catch {}
        jadibots.delete(userId);
    }
    // Hapus sesi lokal (jika ada)
    try {
        const sessionDir = path.join(__dirname, "../../session-jadibot", userId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    } catch {}
    
    // TODO: Tambahkan logika hapus sesi MongoDB jika diperlukan (opsional)
};

const stopAllJadibots = () => {
    for (const [id, sock] of jadibots) {
        try { sock.end(undefined); } catch {}
    }
    jadibots.clear();
};

module.exports = {
    startJadibot,
    stopJadibot,
    getAllJadibotSessions, 
    restartJadibotSession, 
    getActiveJadibots,     
    stopAllJadibots,
    jadibots,
    jadibotStore
};