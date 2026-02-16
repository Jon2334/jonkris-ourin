
const config = {

    info: {
        website: 'jonsilaban.me'
    },

    owner: {
        name: 'jonkris',                    // Nama owner
        number: ['6289509158681']         // Format: 628xxx (tanpa + atau 0)
    },

    session: {
        pairingNumber: '994400007267',   // Nomor WA yang akan di-pair
        usePairingCode: true              // true = Pairing Code, false = QR Code
    },

    bot: {
        name: 'jonkris 𝗠𝗗',                 // Nama bot
        version: '1.9.0',                 // Versi bot
        developer: 'silaban'          // Nama developer
    },

    mode: 'public',

    command: {
        prefix: '.'                       // Prefix utama (.menu, .help, dll)
    },

    vercel: {
        // ambil token vercel: https://vercel.com/account/tokens
        token: ''                        // Vercel Token untuk fitur deploy ( Kalau .deploy mau work, ini wajib di isi )
    },

    store: {
        payment: [
            { name: 'Dana', number: '6289509158681', holder: 'jonkris' },
            { name: 'OVO', number: '6289509158681', holder: 'jonkris' },
            { name: 'GoPay', number: '6289509158681', holder: 'jonkris' },
            { name: 'ShopeePay', number: '6289509158681', holder: 'jonkris' }
        ],
        qris: 'kantin-jaya.vercel.app'
    },

    donasi: {
        payment: [
            { name: 'Dana', number: '089509158681', holder: 'jonkris' },
            { name: 'GoPay', number: '089509158681', holder: 'jonkris' },
            { name: 'OVO', number: '089509158681', holder: 'jonkris' }
        ],
        links: [
            { name: 'Saweria', url: 'jonsilaban.me' },
            { name: 'Trakteer', url: 'kantin-jaya.vercel.app' }
        ],
        benefits: [
            'Mendukung development',
            'Server lebih stabil',
            'Fitur baru lebih cepat',
            'Priority support'
        ],
        qris: 'kantin-jaya.vercel.app'
    },

    limits: {
        default: 25,                      // User biasa
        premium: 100,                     // Premium user
        owner: -1                         // Owner (-1 = unlimited)
    },

    sticker: {
        packname: 'jonkris-AI',             // Nama pack sticker
        author: 'Bot'                     // Author sticker
    },

    saluran: {
        id: 'kantin-jaya.vercel.app',                           // ID saluran (contoh: 120363xxx@newsletter)
        name: 'BangSilaban',       // Nama saluran
        link: 'jonsilaban.me'                          // Link saluran
    },

    features: {
        antiSpam: true,
        antiSpamInterval: 3000,
        antiCall: true,
        autoTyping: true,
        autoRead: false,
        logMessage: true,
        dailyLimitReset: true,
        smartTriggers: true
    },

    registration: {
        enabled: true,
        rewards: {
            balance: 30000,
            limit: 300,
            exp: 300000
        }
    },

    welcome: { defaultEnabled: true },
    goodbye: { defaultEnabled: true },

    premiumUsers: [],
    bannedUsers: [],
    dynamicOwners: [],
    dynamicPremium: [],

    ui: {
        menuVariant: 3
    },

    messages: {
    wait: '⏳ *Chotto matte…* _Sedang diproses ya~_',
    success: '✅ *Mission Clear!*',
    error: '❌ *System Error!* _Terjadi gangguan sistem_',

    ownerOnly: '🚫 *Owner Only!* _Akses tingkat Shujin_',
    premiumOnly: '💎 *Premium Only!* _Mode Tokubetsu diperlukan_',

    groupOnly: '👥 *Party Only!* _Command ini hanya bisa dipakai di grup_',
    privateOnly: '📱 *Private Only!* _Gunakan di chat pribadi_',

    adminOnly: '👮 *Admin Only!* _Izin Kanrisha diperlukan_',
    botAdminOnly: '🤖 *Bot Butuh Admin!* _Berikan role Kanrisha dulu_',

    cooldown: '⏱️ *Cooldown!* _Tunggu `%time%` detik untuk recharge_',
    limitExceeded: '📊 *Limit Habis!* _Energi harian sudah mencapai batas_',

    banned: '🚫 *Akses Disegel!* _Kamu telah di-BAN oleh sistem_'
},

    database: { path: './src/database' },
    backup: { enabled: false, intervalHours: 24, retainDays: 7 },
    scheduler: { resetHour: 0, resetMinute: 0 },

    // Dev mode settings (auto-enabled jika NODE_ENV=development)
    dev: {
        enabled: process.env.NODE_ENV === 'development',
        watchPlugins: true,    // Hot reload plugins (SAFE)
        watchSrc: false,       // DISABLED - src reload causes connection conflict 440
        debugLog: false        // Show stack traces
    },

    // bisa dikosongin
    pterodactyl: {
        server1: {
            domain: '',
            apikey: '',
            capikey: '',
            egg: '15',
            nestid: '5',
            location: '1'
        },
        server2: {
            domain: '',
            apikey: '',
            capikey: '',
            egg: '15',
            nestid: '5',
            location: '1'
        },
        server3: {
            domain: '',
            apikey: '',
            capikey: '',
            egg: '15',
            nestid: '5',
            location: '1'
        },
        server4: {
            domain: '',
            apikey: '',
            capikey: '',
            egg: '15',
            nestid: '5',
            location: '1'
        },
        server5: {
            domain: '',
            apikey: '',
            capikey: '',
            egg: '15',
            nestid: '5',
            location: '1'
        }
    },

    digitalocean: {
        token: '',
        region: 'sgp1',
        sellers: [],
        ownerPanels: []
    },

    // NOTE: ini di versi free gak ada yak, adanya cuma di sc pt doang
    //  daftar di: https://pakasir.com/
    pakasir: {
        enabled: true,
        slug: '',
        apiKey: '',
        defaultMethod: 'qris',
        sandbox: true,
        pollingInterval: 10000
    },

    //  APIkey
    APIkey: {
        lolhuman: 'APIKey-Milik-Bot-OurinMD(Zann,HyuuSATANN,Keisya,Danzz)', // kalau limit habis bisa beli apikey di https://api.lolhuman.xyz/pricing
        neoxr: 'Milik-Bot-OurinMD',  // kalau limit habis bisa beli apikey di https://api.neoxr.eu/pricing
        google: 'AIzaSyA5CSWMWEaOBpFULduGaIpqGPHwvmppuxQ' // API Key Google buat fitur nanobanana
    }
}


// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS - Jangan diubah tod, nanti elol!
// ═══════════════════════════════════════════════════════════════════════════

function isOwner(number) {
    if (!number) return false
    const cleanNumber = number.replace(/[^0-9]/g, '')
    if (!cleanNumber) return false
    
    if (config.bot.number) {
        const botClean = config.bot.number.replace(/[^0-9]/g, '')
        if (botClean && (cleanNumber === botClean || cleanNumber.endsWith(botClean) || botClean.endsWith(cleanNumber))) return true
    }
    
    const ownerList = config.owner?.number || []
    
    return ownerList.some(owner => {
        if (!owner) return false
        const cleanOwner = owner.replace(/[^0-9]/g, '')
        if (!cleanOwner) return false
        return cleanNumber === cleanOwner || cleanNumber.endsWith(cleanOwner) || cleanOwner.endsWith(cleanNumber)
    })
}

function isPremium(number) {
    if (!number) return false
    if (isOwner(number)) return true
    
    const cleanNumber = number.replace(/[^0-9]/g, '')
    const premiumList = config.premiumUsers || []
    
    const inConfig = premiumList.some(premium => {
        if (!premium) return false
        const cleanPremium = premium.replace(/[^0-9]/g, '')
        return cleanNumber === cleanPremium || cleanNumber.endsWith(cleanPremium) || cleanPremium.endsWith(cleanNumber)
    })
    
    if (inConfig) return true
    
    try {
        const { getDatabase } = require('./src/lib/database')
        const db = getDatabase()
        if (db) {
            const savedPremium = db.setting('premiumUsers') || []
            const inDb = savedPremium.some(premium => {
                if (!premium) return false
                const cleanPremium = premium.replace(/[^0-9]/g, '')
                return cleanNumber === cleanPremium || cleanNumber.endsWith(cleanPremium) || cleanPremium.endsWith(cleanNumber)
            })
            if (inDb) return true
        }
    } catch (e) {}
    
    return false
}

function isBanned(number) {
    if (!number) return false
    if (isOwner(number)) return false
    
    const cleanNumber = number.replace(/[^0-9]/g, '')
    return config.bannedUsers.some(banned => {
        const cleanBanned = banned.replace(/[^0-9]/g, '')
        return cleanNumber === cleanBanned || cleanNumber.endsWith(cleanBanned) || cleanBanned.endsWith(cleanNumber)
    })
}

function setBotNumber(number) {
    if (number) config.bot.number = number.replace(/[^0-9]/g, '')
}

function isSelf(number) {
    if (!number || !config.bot.number) return false
    const cleanNumber = number.replace(/[^0-9]/g, '')
    const botNumber = config.bot.number.replace(/[^0-9]/g, '')
    return cleanNumber.includes(botNumber) || botNumber.includes(cleanNumber)
}

function getConfig() { return config }

module.exports = {
    ...config,
    config,
    getConfig,
    isOwner,
    isPremium,
    isBanned,
    setBotNumber,
    isSelf
}
