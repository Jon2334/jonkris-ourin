/**
 * Credits & Thanks to
 * Developer = Lucky Archz ( Zann )
 * Lead owner = HyuuSATAN
 * Owner = Keisya
 * Owner = Syura Salsabila
 * Designer = Danzzz
 * Wileys = Penyedia baileys
 * Penyedia API
 * Penyedia Scraper
 * 
 * JANGAN HAPUS/GANTI CREDITS & THANKS TO
 * JANGAN DIJUAL YA MEK
 * 
 * Saluran Resmi Ourin:
 * https://whatsapp.com/channel/0029VbB37bgBfxoAmAlsgE0t 
 * 
 */
const fs = require('fs');
const path = require('path');
const config = require('../../config');

let Low, JSONFileSync, JSONFile;

/**
 * @typedef {Object} UserData
 * @property {string} jid - JID user
 * @property {string} name - Nama user
 * @property {string} number - Nomor user
 * @property {number} limit - Limit tersisa
 * @property {boolean} isPremium - Status premium
 * @property {boolean} isBanned - Status banned
 * @property {number} exp - Experience points
 * @property {number} level - Level user
 * @property {number} balance - Balance user
 * @property {string[]} unlockedFeatures - Fitur yang sudah di-unlock
 * @property {string} registeredAt - Tanggal registrasi
 * @property {string} lastSeen - Terakhir aktif
 * @property {Object} cooldowns - Cooldown per command
 */

/**
 * @typedef {Object} GroupData
 * @property {string} jid - JID group
 * @property {string} name - Nama group
 * @property {boolean} welcome - Welcome message aktif
 * @property {boolean} leave - Leave message aktif
 * @property {boolean} antilink - Anti link aktif
 * @property {boolean} antitoxic - Anti toxic aktif
 * @property {boolean} mute - Group dimute
 * @property {string[]} warnings - List user yang di-warn
 */

/**
 * Default database structure
 */
const defaultData = {
    users: {},
    groups: {},
    settings: {
        selfMode: false
    },
    stats: {},
    sewa: {
        enabled: false,
        groups: {}
    }
};

/**
 * Database class menggunakan LowDB
 * @class
 */
class Database {
    /**
     * Membuat instance database baru
     * @param {string} dbPath - Path ke directory database
     */
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = null;
        this.ready = false;
        
        this.ensureDir();
    }
    
    /**
     * Initialize database (async for ESM module loading)
     */
    async init() {
        try {
            const { LowSync } = await import('lowdb')
            const { JSONFileSync } = await import('lowdb/node')
            
            const dbFile = path.join(this.dbPath, 'db.json')
            
            if (fs.existsSync(dbFile)) {
                const content = fs.readFileSync(dbFile, 'utf-8').trim()
                if (!content || content === '' || content === '{}') {
                    console.log('[Database] Empty db.json detected, initializing with defaults...')
                    fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf-8')
                } else {
                    try {
                        JSON.parse(content)
                    } catch (parseError) {
                        console.log('[Database] Corrupted db.json detected, backing up and recreating...')
                        const backupFile = path.join(this.dbPath, `db.json.corrupted.${Date.now()}.bak`)
                        fs.copyFileSync(dbFile, backupFile)
                        fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf-8')
                        console.log(`[Database] Backup saved to: ${backupFile}`)
                    }
                }
            } else {
                fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf-8')
            }
            
            const adapter = new JSONFileSync(dbFile)
            this.db = new LowSync(adapter, defaultData)
            
            this.db.read()
            
            if (!this.db.data) {
                this.db.data = defaultData
            }
            this.db.data = { ...defaultData, ...this.db.data }
            
            this.db.write()
            
            this.ready = true
            console.log('[Database] LowDB initialized successfully')
            
            await this.migrateOldData()
            
            return this
        } catch (error) {
            console.error('[Database] Failed to initialize:', error.message)
            this.db = { data: defaultData, write: () => {}, read: () => {} }
            this.ready = true
            return this
        }
    }
    
    /**
     * Migrate data lama dari format JSON terpisah
     */
    async migrateOldData() {
        const oldFiles = ['users.json', 'groups.json', 'settings.json', 'stats.json'];
        
        for (const file of oldFiles) {
            const oldPath = path.join(this.dbPath, file);
            const key = file.replace('.json', '');
            
            if (fs.existsSync(oldPath)) {
                try {
                    const content = fs.readFileSync(oldPath, 'utf-8');
                    const data = JSON.parse(content);
                    if (key === 'users' || key === 'groups') {
                        this.db.data[key] = { ...this.db.data[key], ...data };
                    } else {
                        this.db.data[key] = { ...this.db.data[key], ...data };
                    }
                    const backupPath = oldPath + '.bak';
                    fs.renameSync(oldPath, backupPath);
                    console.log(`[Database] Migrated ${file}`);
                } catch (e) {
                    console.log(`[Database] Skip migration ${file}:`, e.message);
                }
            }
        }
        
        await this.save();
    }
    
    /**
     * Memastikan directory database ada
     * @private
     */
    ensureDir() {
        if (!fs.existsSync(this.dbPath)) {
            fs.mkdirSync(this.dbPath, { recursive: true });
        }
    }
    
    /**
     * Menyimpan data ke file (realtime)
     * @returns {boolean} True jika berhasil
     */
    async save() {
        try {
            if (this.db && this.db.write) {
                await this.db.write();
            }
            return true;
        } catch (error) {
            console.error('[Database] Failed to save:', error.message);
            return false;
        }
    }
    
    /**
     * Mendapatkan data user
     * @param {string} jid - JID user
     * @returns {UserData|null} Data user atau null
     */
    getUser(jid) {
        if (!jid || !this.db?.data) return null;
        const cleanJid = jid.replace(/@.+/g, '');
        return this.db.data.users[cleanJid] || null;
    }
    
    /**
     * Membuat atau update data user
     * @param {string} jid - JID user
     * @param {Object} data - Data untuk disimpan
     * @returns {UserData} Updated user data
     */
    setUser(jid, data = {}) {
        if (!jid || !this.db?.data) return null;
        const cleanJid = jid.replace(/@.+/g, '');
        
        const existing = this.db.data.users[cleanJid] || {};
        
        this.db.data.users[cleanJid] = {
            jid: cleanJid,
            name: data.name || existing.name || 'Unknown',
            number: cleanJid,
            limit: data.limit ?? existing.limit ?? (config.limits?.default || 25),
            isPremium: data.isPremium ?? existing.isPremium ?? false,
            isBanned: data.isBanned ?? existing.isBanned ?? false,
            exp: data.exp ?? existing.exp ?? 0,
            level: data.level ?? existing.level ?? 1,
            balance: data.balance ?? existing.balance ?? 0,
            unlockedFeatures: data.unlockedFeatures ?? existing.unlockedFeatures ?? [],
            registeredAt: existing.registeredAt || new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            cooldowns: data.cooldowns ?? existing.cooldowns ?? {},
            clanId: data.clanId ?? existing.clanId ?? null,
            isRegistered: data.isRegistered ?? existing.isRegistered ?? false,
            regName: data.regName ?? existing.regName ?? null,
            regAge: data.regAge ?? existing.regAge ?? null,
            regGender: data.regGender ?? existing.regGender ?? null,
            rpg: {
                ...(existing.rpg || {}),
                ...(data.rpg || {})
            },
            inventory: {
                ...(existing.inventory || {}),
                ...(data.inventory || {})
            },
            ...data,
            access: data.access || existing.access || [],
        }
        
        if (this.db && this.db.write) {
            this.db.write();
        }
        return this.db.data.users[cleanJid];
    }
    
    /**
     * Menghapus data user
     * @param {string} jid - JID user
     * @returns {boolean} True jika berhasil
     */
    deleteUser(jid) {
        if (!jid || !this.db?.data) return false;
        const cleanJid = jid.replace(/@.+/g, '');
        
        if (this.db.data.users[cleanJid]) {
            delete this.db.data.users[cleanJid];
            this.save();
            return true;
        }
        return false;
    }
    
    /**
     * Mendapatkan semua users
     * @returns {Object<string, UserData>} Object semua users
     */
    getAllUsers() {
        return this.db?.data?.users || {};
    }
    
    /**
     * Mendapatkan total user
     * @returns {number} Total user
     */
    getUserCount() {
        return Object.keys(this.db?.data?.users || {}).length;
    }
    
    /**
     * Update limit user
     * @param {string} jid - JID user
     * @param {number} amount - Jumlah limit yang diubah
     * @returns {number} Limit baru
     */
    updateLimit(jid, amount) {
        const user = this.getUser(jid) || this.setUser(jid);
        if (user.limit === -1) return -1;
        user.limit = Math.max(0, (user.limit || 0) + amount);
        this.setUser(jid, user);
        return user.limit;
    }
    
    updateBalance(jid, amount) {
        const user = this.getUser(jid) || this.setUser(jid);
        const MAX_BALANCE = 9000000000000;
        user.balance = Math.max(0, Math.min(MAX_BALANCE, (user.balance || 0) + amount));
        this.setUser(jid, user);
        return user.balance;
    }
    
    updateExp(jid, amount) {
        const user = this.getUser(jid) || this.setUser(jid);
        const MAX_EXP = 9000000000;
        user.exp = Math.max(0, Math.min(MAX_EXP, (user.exp || 0) + amount));
        this.setUser(jid, user);
        return user.exp;
    }
    
    getTopUsers(field, limit = 10) {
        if (!this.db?.data?.users) return [];
        const users = Object.values(this.db.data.users);
        return users
            .filter(u => (u[field] || 0) > 0)
            .sort((a, b) => (b[field] || 0) - (a[field] || 0))
            .slice(0, limit);
    }
    
    /**
     * Cek dan set cooldown
     * @param {string} jid - JID user
     * @param {string} command - Nama command
     * @param {number} seconds - Durasi cooldown dalam detik
     * @returns {number|false} Sisa waktu cooldown atau false
     */
    checkCooldown(jid, command, seconds) {
        let user = this.getUser(jid);
        if (!user) {
            this.setUser(jid);
            user = this.getUser(jid);
        }
        if (!user) return false;
        
        if (!user.cooldowns || typeof user.cooldowns !== 'object') {
            user.cooldowns = {};
            this.setUser(jid, { cooldowns: {} });
        }
        
        const cooldowns = user.cooldowns || {};
        const now = Date.now();
        const cooldownEnd = cooldowns[command] || 0;
        
        if (now < cooldownEnd) {
            return Math.ceil((cooldownEnd - now) / 1000);
        }
        
        return false;
    }

    
    /**
     * Set cooldown untuk user
     * @param {string} jid - JID user
     * @param {string} command - Nama command
     * @param {number} seconds - Durasi cooldown dalam detik
     */
    setCooldown(jid, command, seconds) {
        let user = this.getUser(jid);
        if (!user) {
            user = this.setUser(jid, { cooldowns: {} });
        }
        if (!user) return;
        
        if (!user.cooldowns || typeof user.cooldowns !== 'object') {
            user.cooldowns = {};
        }
        
        user.cooldowns[command] = Date.now() + (seconds * 1000);
        this.setUser(jid, { cooldowns: user.cooldowns });
    }
    
    /**
     * Mendapatkan data group
     * @param {string} jid - JID group
     * @returns {GroupData|null} Data group atau null
     */
    getGroup(jid) {
        if (!jid || !this.db?.data) return null;
        return this.db.data.groups[jid] || null;
    }
    
    /**
     * Membuat atau update data group
     * @param {string} jid - JID group
     * @param {Object} data - Data untuk disimpan
     * @returns {GroupData} Updated group data
     */
    setGroup(jid, data = {}) {
        if (!jid || !this.db?.data) return null;
        
        const existing = this.db.data.groups[jid] || {};
        
        let config;
        try {
            config = require('../../config');
        } catch {
            config = {};
        }
        
        const welcomeDefault = config.welcome?.defaultEnabled ?? false;
        const goodbyeDefault = config.goodbye?.defaultEnabled ?? false;
        
        this.db.data.groups[jid] = {
            jid,
            name: data.name || existing.name || 'Unknown Group',
            welcome: data.welcome ?? existing.welcome ?? welcomeDefault,
            leave: data.leave ?? existing.leave ?? goodbyeDefault,
            goodbye: data.goodbye ?? existing.goodbye ?? goodbyeDefault,
            antilink: data.antilink ?? existing.antilink ?? false,
            antitoxic: data.antitoxic ?? existing.antitoxic ?? false,
            mute: data.mute ?? existing.mute ?? false,
            warnings: data.warnings ?? existing.warnings ?? [],
            ...data
        };
        
        this.save();
        return this.db.data.groups[jid];
    }
    
    /**
     * Mendapatkan semua groups
     * @returns {Object<string, GroupData>} Object semua groups
     */
    getAllGroups() {
        return this.db?.data?.groups || {};
    }
    
    /**
     * Mendapatkan atau set settings
     * @param {string} key - Key setting
     * @param {*} [value] - Value untuk di-set (optional)
     * @returns {*} Value setting
     */
    setting(key, value = undefined) {
        if (!this.db?.data) return undefined;
        
        if (value !== undefined) {
            this.db.data.settings[key] = value;
            this.save();
        }
        return this.db.data.settings[key];
    }
    
    /**
     * Mendapatkan semua settings
     * @returns {Object} Object settings
     */
    getSettings() {
        return this.db?.data?.settings || {};
    }
    
    /**
     * Update stats
     * @param {string} key - Key stats
     * @param {number} [increment=1] - Nilai increment
     * @returns {number} Nilai baru
     */
    incrementStat(key, increment = 1) {
        if (!this.db?.data) return 0;
        
        if (!this.db.data.stats[key]) {
            this.db.data.stats[key] = 0;
        }
        this.db.data.stats[key] += increment;
        this.save();
        return this.db.data.stats[key];
    }
    
    /**
     * Mendapatkan stats
     * @param {string} [key] - Key stats (optional)
     * @returns {number|Object} Nilai stats atau semua stats
     */
    getStats(key) {
        if (!this.db?.data) return key ? 0 : {};
        
        if (key) {
            return this.db.data.stats[key] || 0;
        }
        return this.db.data.stats || {};
    }
    
    /**
     * Reset limit semua user
     * Non-premium: set ke defaultLimit
     * Premium: set ke premiumLimit (atau -1 for unlimited)
     * @param {number} [defaultLimit=25] - Default limit for non-premium
     * @param {number} [premiumLimit=-1] - Limit for premium users (-1 = unlimited)
     * @returns {number} Jumlah user yang di-reset
     */
    resetAllLimits(defaultLimit = 25, premiumLimit = -1) {
        if (!this.db?.data) return 0;
        
        let count = 0;
        for (const jid of Object.keys(this.db.data.users)) {
            const user = this.db.data.users[jid];
            if (user.isPremium) {
                user.limit = premiumLimit;
            } else {
                user.limit = defaultLimit;
            }
            count++;
        }
        this.save();
        return count;
    }
    
    /**
     * Backup database
     * @returns {string} Path file backup
     */
    backup() {
        const backupDir = path.join(this.dbPath, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}.json`);
        
        fs.writeFileSync(backupPath, JSON.stringify(this.db?.data || {}, null, 2), 'utf-8');
        
        return backupPath;
    }
}

let dbInstance = null;

/**
 * Inisialisasi database (async)
 * @param {string} dbPath - Path ke directory database
 * @returns {Promise<Database>} Instance database
 */
async function initDatabase(dbPath) {
    if (!dbInstance) {
        dbInstance = new Database(dbPath);
        await dbInstance.init();
    }
    return dbInstance;
}

/**
 * Mendapatkan instance database
 * @returns {Database} Instance database
 */
function getDatabase() {
    if (!dbInstance) {
        throw new Error('Database not initialized. Call initDatabase first.');
    }
    return dbInstance;
}

module.exports = {
    Database,
    initDatabase,
    getDatabase
};
