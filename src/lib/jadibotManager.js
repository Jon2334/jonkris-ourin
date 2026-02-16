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
const { logger, c } = require("./colors");

// --- SETUP STORE (SAFE MODE / ANTI CRASH) ---
// Bagian ini mengatasi error "makeInMemoryStore is not a function"
// Jika gagal dimuat, bot tetap jalan tanpa fitur store (memory saving).
let jadibotStore = null;
try {
    if (typeof makeInMemoryStore === 'function') {
        jadibotStore = makeInMemoryStore({ 
            logger: pino().child({ level: 'silent', stream: 'store' }) 
        });
    } else {
        logger.warn("Jadibot", "makeInMemoryStore is not a function. Running in stateless mode.");
    }
} catch (e) {
    logger.warn("Jadibot", "Store initialization failed. Running in stateless mode.");
}

// Map untuk menyimpan sesi aktif: ID User -> Socket
const jadibots = new Map();

/**
 * Fungsi untuk mengambil daftar sesi yang tersimpan di folder
 */
const getSavedSessions = () => {
    const sessionPath = path.join(__dirname, "../../session-jadibot");
    if (!fs.existsSync(sessionPath)) return [];
    try {
        return fs.readdirSync(sessionPath)
            .filter(file => fs.statSync(path.join(sessionPath, file)).isDirectory());
    } catch {
        return [];
    }
};

/**
 * Fungsi utama memulai sesi Jadibot
 * @param {Object} mainSock - Socket bot utama (untuk kirim QR/Notif ke user)
 * @param {String} userId - Nomor HP user (misal: 628xxx)
 * @param {Boolean} isRestart - Apakah ini restart sistem? (true = jangan kirim QR baru jika sesi valid)
 */
const startJadibot = async (mainSock, userId, isRestart = false) => {
    try {
        const sessionDir = path.join(__dirname, "../../session-jadibot", userId);
        
        // Buat folder sesi jika belum ada
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: "silent" }),
            printQRInTerminal: false, // QR jangan diprint di terminal Heroku
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
                return { conversation: "Jadibot is active!" };
            }
        });

        // Bind store jika tersedia
        if (jadibotStore) jadibotStore.bind(sock.ev);

        // Simpan instance ke Map
        jadibots.set(userId, sock);

        // Update kredensial login
        sock.ev.on("creds.update", saveCreds);

        // Handler status koneksi
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // --- GENERATE & KIRIM QR CODE ---
            if (qr && !isRestart) {
                logger.info(`Jadibot ${userId}`, "Generating QR...");
                try {
                    // Kirim pesan instruksi
                    await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                        text: "Memproses QR Code Jadibot...\nSilakan scan menggunakan 'Linked Devices' di WhatsApp." 
                    });
                    
                    // Convert QR string ke Buffer Image
                    const qrBuffer = await QRCode.toBuffer(qr, { scale: 8 });
                    
                    // Kirim Gambar QR ke User
                    await mainSock.sendMessage(userId + "@s.whatsapp.net", {
                        image: qrBuffer,
                        caption: "Scan kode ini dalam 30 detik.\nKetik *.stopjadibot* untuk membatalkan."
                    });
                } catch (err) {
                    logger.error(`Jadibot ${userId}`, `Failed to send QR: ${err.message}`);
                }
            }

            // --- KONEKSI TERBUKA ---
            if (connection === "open") {
                logger.success(`Jadibot ${userId}`, "Connected");
                // Beritahu user via bot utama
                try {
                    await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                        text: "✅ *Jadibot Berhasil Terhubung!*\nBot Anda siap digunakan." 
                    });
                } catch {}
            }

            // --- KONEKSI TERPUTUS ---
            if (connection === "close") {
                const reason = lastDisconnect?.error?.output?.statusCode;
                
                // Hapus dari Map sementara
                jadibots.delete(userId);

                if (reason === DisconnectReason.loggedOut) {
                    logger.warn(`Jadibot ${userId}`, "Logged out (Session Invalid)");
                    stopJadibot(userId); // Hapus folder sesi
                    try {
                        await mainSock.sendMessage(userId + "@s.whatsapp.net", { 
                            text: "❌ Sesi Jadibot Anda telah berakhir (Logout). Silakan scan ulang." 
                        });
                    } catch {}
                } else {
                    // Reconnect otomatis untuk alasan lain (Restart, Timeout, dll)
                    logger.info(`Jadibot ${userId}`, "Reconnecting...");
                    // Delay sedikit agar tidak spamming
                    await delay(3000);
                    startJadibot(mainSock, userId, true);
                }
            }
        });

        // --- HANDLER PESAN (MENGGUNAKAN HANDLER UTAMA) ---
        sock.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                // Kita import handler secara dinamis di sini untuk menghindari circular dependency
                // Pastikan path '../handler' sesuai dengan lokasi file handler.js kamu
                const { messageHandler } = require("../handler");
                
                const m = chatUpdate.messages[0];
                if (!m.message) return;
                
                // Modifikasi objek pesan agar handler tahu ini dari jadibot
                m.isJadibot = true; 
                m.jadibotOwner = userId;

                // Jalankan handler utama
                if (messageHandler) {
                    await messageHandler(m, sock);
                }
            } catch (err) {
                // Ignore error handler di jadibot agar tidak flooding log
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
            sock.ws.close();
        } catch {}
        jadibots.delete(userId);
    }

    // Hapus folder sesi
    try {
        const sessionDir = path.join(__dirname, "../../session-jadibot", userId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
            logger.success(`Jadibot ${userId}`, "Session deleted");
        }
    } catch (err) {
        logger.error(`Jadibot ${userId}`, `Stop Error: ${err.message}`);
    }
};

/**
 * Mengembalikan semua sesi yang tersimpan (untuk auto-restart saat bot utama nyala)
 */
const restoreJadibots = async (mainSock) => {
    const sessions = getSavedSessions();
    if (sessions.length > 0) {
        logger.info("Jadibot", `Restoring ${sessions.length} sessions...`);
        for (const userId of sessions) {
            await startJadibot(mainSock, userId, true);
            await delay(2000); // Delay antar start biar ga berat
        }
    }
};

module.exports = {
    startJadibot,
    stopJadibot,
    restoreJadibots,
    getSavedSessions,
    jadibots,
    jadibotStore // Ekspor store jika modul lain butuh (walau mungkin null)
};