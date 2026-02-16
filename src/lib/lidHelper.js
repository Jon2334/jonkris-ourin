const { jidDecode, areJidsSameUser } = require('@whiskeysockets/baileys');

// Cache untuk menyimpan mapping LID ke JID agar tidak query terus menerus
const lidCache = new Map();

/**
 * Cek apakah JID adalah LID (Link ID)
 * @param {string} jid 
 * @returns {boolean}
 */
const isLid = (jid) => {
    return jid?.endsWith('@lid');
};

/**
 * Cek apakah LID sudah ada di cache/terkonversi
 * @param {string} jid 
 * @returns {boolean}
 */
const isLidConverted = (jid) => {
    return lidCache.has(jid);
};

/**
 * Mendapatkan JID asli dari LID
 * @param {string} lid 
 * @returns {string|null} Phone JID (s.whatsapp.net)
 */
const lidToJid = (lid) => {
    return lidCache.get(lid) || null;
};

/**
 * Menambahkan mapping LID -> JID ke cache
 * @param {string} lid 
 * @param {string} jid 
 */
const addLidToCache = (lid, jid) => {
    if (lid && jid && isLid(lid)) {
        lidCache.set(lid, jid);
    }
};

/**
 * Menyimpan data participant dari metadata grup ke cache LID
 * @param {Array} participants 
 */
const cacheParticipantLids = (participants = []) => {
    if (!Array.isArray(participants)) return;
    participants.forEach(p => {
        if (p.lid && p.id) {
            addLidToCache(p.lid, p.id);
        }
    });
};

/**
 * Get cached JID for a LID
 * @param {string} lid 
 * @returns {string|null}
 */
const getCachedJid = (lid) => {
    return lidCache.get(lid) || null;
}

/**
 * Resolve LID ke JID menggunakan cache atau fallback
 * @param {string} jid 
 * @param {Array} groupMetadataParticipants (opsional)
 * @returns {string} JID yang sudah di-resolve
 */
const resolveAnyLidToJid = (jid, groupMetadataParticipants = []) => {
    if (!isLid(jid)) return jid;

    // Cek cache dulu
    if (lidCache.has(jid)) return lidCache.get(jid);

    // Cek dari metadata grup yang diberikan
    if (groupMetadataParticipants && groupMetadataParticipants.length > 0) {
        const found = groupMetadataParticipants.find(p => p.lid === jid);
        if (found && found.id) {
            addLidToCache(jid, found.id);
            return found.id;
        }
    }

    return jid; // Jika gagal, kembalikan aslinya
};

/**
 * Resolve LID dari participant object
 * @param {string} jid 
 * @param {Array} participants 
 * @returns {string}
 */
const resolveLidFromParticipants = (jid, participants = []) => {
   return resolveAnyLidToJid(jid, participants);
}


/**
 * Konversi array JID yang mungkin berisi LID menjadi JID biasa
 * @param {Array} jids 
 * @param {Array} groupParticipants 
 * @returns {Array}
 */
const convertLidArray = (jids = [], groupParticipants = []) => {
    if (!Array.isArray(jids)) return [];
    return jids.map(jid => resolveAnyLidToJid(jid, groupParticipants));
};

/**
 * Decode dan normalize JID
 * @param {string} jid 
 * @returns {string}
 */
const decodeAndNormalize = (jid) => {
    if (!jid) return '';
    const decode = jidDecode(jid);
    if (!decode) return jid;
    return `${decode.user}@${decode.server}`;
};

// Tambahan fungsi yang mungkin dipanggil di file lain
const extractNumber = (jid) => jid ? jid.replace(/@.+/g, '') : '';

module.exports = {
    isLid,
    isLidConverted,
    lidToJid,
    addLidToCache,
    cacheParticipantLids,
    getCachedJid,
    resolveAnyLidToJid,
    resolveLidFromParticipants,
    convertLidArray,
    decodeAndNormalize,
    areJidsSameUser,
    extractNumber
};