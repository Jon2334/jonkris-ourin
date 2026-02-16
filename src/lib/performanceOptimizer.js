/**
 * PERFORMANCE OPTIMIZER
 * Menangani caching data user, grup, dan settings untuk mengurangi beban database.
 * Menggunakan lru-cache untuk manajemen memori yang efisien.
 */

// --- IMPOR YANG AMAN (UNIVERSAL FIX) ---
// Ini menangani perbedaan cara impor antara lru-cache v6, v7, dan v10+
// agar tidak terjadi error "LRUCache is not a constructor"
const _lru = require('lru-cache');
const LRUCache = _lru.LRUCache || _lru;

// --- KONFIGURASI CACHE ---
// Cache User: Maksimal 500 user, kadaluarsa dalam 5 menit
const userCache = new LRUCache({ 
    max: 500, 
    ttl: 1000 * 60 * 5,
    updateAgeOnGet: true // Memperpanjang umur cache jika diakses
});

// Cache Grup: Maksimal 200 grup, kadaluarsa dalam 5 menit
const groupCache = new LRUCache({ 
    max: 200, 
    ttl: 1000 * 60 * 5,
    updateAgeOnGet: true
});

// Cache Settings: Maksimal 100 settings, kadaluarsa dalam 10 menit
const settingsCache = new LRUCache({ 
    max: 100, 
    ttl: 1000 * 60 * 10 
});

// --- DEBOUNCE SYSTEM ---
const messageDebounce = new Map();
const DEBOUNCE_MS = 100; // Jeda waktu antar pesan (ms) untuk mencegah spam processing

/**
 * Mengecek apakah pesan harus di-debounce (diabaikan sementara)
 * @param {string} key - ID unik (misal: remoteJid + messageId)
 * @returns {boolean} true jika pesan terlalu cepat
 */
function debounceMessage(key) {
    const now = Date.now();
    const last = messageDebounce.get(key);
    
    // Jika pesan datang kurang dari 100ms dari sebelumnya
    if (last && (now - last) < DEBOUNCE_MS) {
        return true;
    }
    
    messageDebounce.set(key, now);
    
    // Bersihkan map jika sudah terlalu penuh (mencegah memory leak)
    if (messageDebounce.size > 1000) {
        // Hapus entry yang sudah lama (> 200ms)
        const cutoff = now - (DEBOUNCE_MS * 2);
        for (const [k, v] of messageDebounce.entries()) {
            if (v < cutoff) messageDebounce.delete(k);
        }
    }
    
    return false;
}

/**
 * Mengambil data user dari cache, jika tidak ada ambil dari DB
 */
function getCachedUser(jid, db) {
    // Cek cache dulu
    let user = userCache.get(jid);
    
    // Jika tidak ada di cache, ambil dari database
    if (!user) {
        // Pastikan db.getUser ada sebelum dipanggil
        if (db && typeof db.getUser === 'function') {
            user = db.getUser(jid);
            // Jika user ditemukan di DB, simpan ke cache
            if (user) userCache.set(jid, user);
        }
    }
    return user;
}

/**
 * Menyimpan data user ke cache dan database sekaligus
 */
function setCachedUser(jid, data, db) {
    userCache.set(jid, data);
    if (db && typeof db.setUser === 'function') {
        db.setUser(jid, data);
    }
}

/**
 * Menghapus user tertentu dari cache (misal saat data diupdate manual)
 */
function invalidateUserCache(jid) {
    userCache.delete(jid);
}

/**
 * Mengambil data grup dari cache, jika tidak ada ambil dari DB
 */
function getCachedGroup(jid, db) {
    let group = groupCache.get(jid);
    if (!group) {
        if (db && typeof db.getGroup === 'function') {
            group = db.getGroup(jid);
            if (group) groupCache.set(jid, group);
        }
    }
    return group;
}

/**
 * Menyimpan data grup ke cache dan database
 */
function setCachedGroup(jid, data, db) {
    groupCache.set(jid, data);
    if (db && typeof db.setGroup === 'function') {
        db.setGroup(jid, data);
    }
}

function invalidateGroupCache(jid) {
    groupCache.delete(jid);
}

/**
 * Mengambil setting bot
 */
function getCachedSetting(key, db) {
    let setting = settingsCache.get(key);
    if (setting === undefined) {
        if (db && typeof db.setting === 'function') {
            // Jika db.setting dipanggil dengan 1 argumen = getter
            setting = db.setting(key);
            if (setting !== undefined) settingsCache.set(key, setting);
        }
    }
    return setting;
}

/**
 * Menyimpan setting bot
 */
function setCachedSetting(key, value, db) {
    settingsCache.set(key, value);
    if (db && typeof db.setting === 'function') {
        // Jika db.setting dipanggil dengan 2 argumen = setter
        db.setting(key, value);
    }
}

function invalidateSettingCache(key) {
    settingsCache.delete(key);
}

/**
 * Membersihkan semua cache (misal saat restart atau reload database)
 */
function clearAllCaches() {
    userCache.clear();
    groupCache.clear();
    settingsCache.clear();
    messageDebounce.clear();
}

/**
 * Statistik penggunaan cache (untuk debugging)
 */
function getCacheStats() {
    return {
        users: userCache.size || 0,
        groups: groupCache.size || 0,
        settings: settingsCache.size || 0,
        debounce: messageDebounce.size || 0
    };
}

module.exports = {
    debounceMessage,
    getCachedUser,
    setCachedUser,
    invalidateUserCache,
    getCachedGroup,
    setCachedGroup,
    invalidateGroupCache,
    getCachedSetting,
    setCachedSetting,
    invalidateSettingCache,
    clearAllCaches,
    getCacheStats,
    // Ekspor objek cache langsung jika butuh akses low-level di file lain
    userCache,
    groupCache,
    settingsCache
};