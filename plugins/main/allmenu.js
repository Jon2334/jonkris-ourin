const config = require('../../config')
const { formatUptime, getTimeGreeting } = require('../../src/lib/formatter')
const { getCommandsByCategory, getCategories } = require('../../src/lib/plugins')
const { getCasesByCategory, getCaseCount } = require('../../case/ourin')
const fs = require('fs')
const path = require('path')
const moment = require('moment-timezone')

const pluginConfig = {
    name: 'allmenu',
    alias: ['fullmenu', 'am', 'allcommand', 'semua'],
    category: 'main',
    description: 'Menampilkan semua command lengkap per kategori',
    usage: '.allmenu',
    example: '.allmenu',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

const CATEGORY_EMOJIS = {
    owner: '👑', main: '🏠', utility: '🔧', fun: '🎮', group: '👥',
    download: '📥', search: '🔍', tools: '🛠️', sticker: '🖼️',
    ai: '🤖', game: '🎯', media: '🎬', info: 'ℹ️', religi: '☪️',
    panel: '🖥️', user: '📊', linode: '☁️', random: '🎲', canvas: '🎨', 
    vps: '🌊', store: '🏪', premium: '💎', convert: '🔄', economy: '💰',
    cek: '📋', ephoto: '🎨', jpm: '📢', pushkontak: '📱'
}

// Fungsi helper string aman
function toSmallCaps(text) {
    if (!text) return '';
    const smallCaps = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ',
        'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
        'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ',
        'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    }
    return text.toLowerCase().split('').map(c => smallCaps[c] || c).join('')
}

function getContextInfo(botConfig, m) {
    const saluranId = botConfig.saluran?.id || '120363208449943317@newsletter'
    const saluranName = botConfig.saluran?.name || 'Ourin-AI'
    
    return {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127
        }
    }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    try {
        const prefix = botConfig.command?.prefix || '.'
        // Null safety untuk user & group
        const user = db.getUser(m.sender) || {}
        const groupData = m.isGroup ? (db.getGroup(m.chat) || {}) : {}
        const botMode = groupData.botMode || 'md'
        
        const categories = getCategories()
        const commandsByCategory = getCommandsByCategory()
        const casesByCategory = getCasesByCategory()
        
        let totalCommands = 0
        for (const category of categories) {
            totalCommands += (commandsByCategory[category] || []).length
        }
        const totalCases = getCaseCount()
        const totalFeatures = totalCommands + totalCases
        
        let userRole = 'User', roleEmoji = '👤'
        if (m.isOwner) { userRole = 'Owner'; roleEmoji = '👑' }
        else if (m.isPremium) { userRole = 'Premium'; roleEmoji = '💎' }
        
        const greeting = getTimeGreeting()
        const uptimeFormatted = formatUptime(uptime)
        const totalUsers = db.getUserCount()
        
        // Header Menu
        let txt = `Hai *@${(m.pushName || 'User')}* 🪸\n`
        txt += `Aku *${botConfig.bot?.name || 'Ourin-AI'}*, bot WhatsApp yang siap bantu kamu.\n\n`

        txt += `— 🤖 *ʙᴏᴛ ɪɴꜰᴏ* 」\n`
        txt += `\`◦\` ɴᴀᴍᴀ: *${botConfig.bot?.name || 'Ourin-AI'}*\n`
        txt += `\`◦\` ᴠᴇʀsɪ: *v${botConfig.bot?.version || '1.9.0'}*\n`
        txt += `\`◦\` ᴍᴏᴅᴇ: *${(botConfig.mode || 'public').toUpperCase()}*\n`
        txt += `\`◦\` ᴘʀᴇꜰɪx: *[ ${prefix} ]*\n`
        txt += `\`◦\` ᴜᴘᴛɪᴍᴇ: *${uptimeFormatted}*\n`
        txt += `\`◦\` ᴛᴏᴛᴀʟ ᴜsᴇʀ: *${totalUsers}*\n`
        txt += `\`◦\` ᴛᴏᴛᴀʟ ꜰɪᴛᴜʀ: *${totalFeatures}*\n\n`
        
        txt += `— 👤 *ᴜsᴇʀ ɪɴꜰᴏ* 」\n`
        txt += `\`◦\` ɴᴀᴍᴀ: *${m.pushName || 'User'}*\n`
        txt += `\`◦\` ʀᴏʟᴇ: *${roleEmoji} ${userRole}*\n`
        txt += `\`◦\` ʟɪᴍɪᴛ: *${m.isOwner || m.isPremium ? '∞ Unlimited' : (user.limit || 0)}*\n\n`
        
        // Sorting Kategori
        const categoryOrder = ['owner', 'main', 'utility', 'tools', 'fun', 'game', 'download', 'search', 'sticker', 'media', 'ai', 'group', 'religi', 'info', 'cek', 'economy', 'user', 'canvas', 'random', 'premium']
        const sortedCategories = [...categories].sort((a, b) => {
            const indexA = categoryOrder.indexOf(a)
            const indexB = categoryOrder.indexOf(b)
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
        })
        
        // Loop Categories
        for (const category of sortedCategories) {
            // Filter hak akses
            if (category === 'owner' && !m.isOwner) continue
            
            // Filter mode bot (md/store/pushkontak)
            if (botMode === 'md' && ['panel', 'pushkontak', 'store'].includes(category)) continue
            if (botMode === 'store' && !['main', 'group', 'sticker', 'owner', 'store'].includes(category)) continue

            const pluginCmds = commandsByCategory[category] || []
            const caseCmds = casesByCategory[category] || []
            // Gabung & filter null/duplicate
            const allCmds = [...new Set([...pluginCmds, ...caseCmds])].filter(c => c)
            
            if (allCmds.length === 0) continue
            
            const emoji = CATEGORY_EMOJIS[category] || '📋'
            const categoryName = toSmallCaps(category)
            
            txt += `╭┈┈⬡「 ${emoji} *${categoryName}* 」\n`
            for (const cmd of allCmds) {
                txt += `┃ ◦ *${prefix}${toSmallCaps(cmd)}*\n`
            }
            txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        }
        
        txt += `_© ${botConfig.bot?.name || 'Ourin-AI'} | ${moment().tz('Asia/Jakarta').format('YYYY')}_\n`
        txt += `_ᴅᴇᴠᴇʟᴏᴘᴇʀ: ${botConfig.bot?.developer || 'Lucky Archz'}_`
        
        // --- LOGIKA GAMBAR DENGAN PROTEKSI ---
        
        // 1. Definisikan Path
        const imagePath = path.join(process.cwd(), 'assets', 'images', 'ourin-allmenu.jpg')
        const fallbackPath = path.join(process.cwd(), 'assets', 'images', 'ourin.jpg')
        
        // 2. Cek Keberadaan File & Baca ke Buffer
        let buffer = null
        if (fs.existsSync(imagePath)) {
            buffer = fs.readFileSync(imagePath)
        } else if (fs.existsSync(fallbackPath)) {
            buffer = fs.readFileSync(fallbackPath)
        }

        // 3. Kirim Pesan Sesuai Kondisi Buffer
        if (buffer) {
            // Jika buffer ADA (tidak null), kirim sebagai IMAGE
            await sock.sendMessage(m.chat, {
                image: buffer,
                caption: txt,
                contextInfo: getContextInfo(botConfig, m)
            }, { quoted: m })
        } else {
            // Jika buffer NULL (file tidak ketemu), kirim sebagai TEXT saja
            // Ini mencegah error "Received null"
            await sock.sendMessage(m.chat, {
                text: txt,
                contextInfo: getContextInfo(botConfig, m)
            }, { quoted: m })
        }

    } catch (error) {
        console.error('[AllMenu] Critical Error:', error)
        m.reply('❌ Terjadi kesalahan saat menampilkan menu.')
    }
}

module.exports = {
    config: pluginConfig,
    handler
}