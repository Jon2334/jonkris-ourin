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

// --- SETUP STORE (SAFE MODE) ---
// Mencegah crash jika makeInMemoryStore error
let jadibotStore = null;
try {
    if (typeof makeInMemoryStore === 'function') {
        jadibotStore = makeInMemoryStore({ 
            logger: pino().child({ level: 'silent', stream: 'store' }) 
        });
    }
} catch (e) {}

// Map untuk menyimpan sesi aktif: ID User -> Socket
const jadibots = new Map();

/**
 * Mendapatkan daftar semua sesi jadibot yang tersimpan di folder
 * Dipanggil oleh index.js saat startup
 */
const getAllJadibotSessions = () => {
    const sessionPath = path.join(__dirname, "../../session-jadibot");
    if (!fs.existsSync(sessionPath)) return [];
    try {
        const sessions = fs.readdirSync(sessionPath)
            .filter(file => fs.statSync(path.join(sessionPath, file)).isDirectory());
        // Return format object { id: 'nomor' } agar sesuai dengan index.js
        return sessions.map(id => ({ id }));
    } catch {
        return [];
    }
};

/**
 * Mendapatkan list jadibot yang sedang aktif (Online)
 * Dipanggil oleh handler.js untuk cek mode self/public
 */
const getActiveJadibots = () => {
    const active = [];
    for (const [id, _] of jadibots) {
        active.push({ id });
    }
    return active;
};

/**
 * Restart sesi jadibot (Wrapper untuk startJadibot)
 * Dipanggil oleh index.js
 */
const restartJadibotSession = async (mainSock, id) => {
    return startJadibot(mainSock, id, true);
};

/**
 * Fungsi utama memulai sesi Jadibot
 * @param {Object} mainSock - Socket bot utama
 * @param {String} userId - Nomor HP user
 * @param {Boolean} isRestart - Apakah ini restart sistem?
 */
const startJadibot = async (mainSock, userId, isRestart = false) => {
    try {
        const sessionDir = path.join(__dirname, "../../session-jadibot", userId);
        
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
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
                // Kirim QR ke user via bot utama
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
                // Coba kirim pesan sukses ke user (jangan crash jika gagal)
                try {
                    await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                        text: "✅ Jadibot berhasil terhubung!" 
                    });
                } catch {}
            }

            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                
                // Hapus dari map memori
                jadibots.delete(userId);

                if (reason === DisconnectReason.loggedOut) {
                    logger.warn(`Jadibot ${userId}`, "Logged out");
                    stopJadibot(userId); // Hapus folder sesi
                    try {
                        await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                            text: "❌ Sesi Jadibot terputus (Logout)." 
                        });
                    } catch {}
                } else {
                    // Reconnect otomatis
                    logger.info(`Jadibot ${userId}`, "Reconnecting...");
                    await delay(3000);
                    startJadibot(mainSock, userId, true);
                }
            }
        });

        // Handler Pesan untuk Jadibot
        sock.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                // Import handler secara dinamis untuk menghindari circular dependency error
                const handlerModule = require("../handler");
                if (handlerModule && handlerModule.messageHandler) {
                    const m = chatUpdate.messages[0];
                    if (!m.message) return;
                    
                    // Tambahkan flag isJadibot agar handler tahu
                    await handlerModule.messageHandler(m, sock, { 
                        isJadibot: true, 
                        jadibotId: userId 
                    });
                }
            } catch (err) {
                // Silent error agar tidak spam log
            }
        });

    } catch (err) {
        logger.error(`Jadibot ${userId}`, `Start Error: ${err.message}`);
    }
};

/**
 * Menghentikan sesi Jadibot & Menghapus Data
 */
const stopJadibot = (userId) => {
    const sock = jadibots.get(userId);
    if (sock) {
        try {
            sock.end(undefined);
        } catch {}
        jadibots.delete(userId);
    }

    try {
        const sessionDir = path.join(__dirname, "../../session-jadibot", userId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    } catch {}
};

/**
 * Stop semua jadibot (untuk shutdown)
 */
const stopAllJadibots = () => {
    for (const [id, sock] of jadibots) {
        try { sock.end(undefined); } catch {}
    }
    jadibots.clear();
};

module.exports = {
    startJadibot,
    stopJadibot,
    getAllJadibotSessions, // Digunakan index.js
    restartJadibotSession, // Digunakan index.js
    getActiveJadibots,     // Digunakan handler.js
    stopAllJadibots,
    jadibots,
    jadibotStore
};