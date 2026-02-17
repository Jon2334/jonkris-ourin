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

// Fungsi proteksi string agar tidak null/undefined
function toSmallCaps(text) {
    if (!text || typeof text !== 'string') return '';
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
    const saluranName = botConfig.saluran?.name || 'Ourin-AI Official'
    
    return {
        mentionedJid: [m.sender],
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: saluranId,
            newsletterName: saluranName,
            serverMessageId: 127
        },
        externalAdReply: {
            title: `Ourin-AI Full Menu`,
            body: `Status: Online | Multi Device`,
            thumbnailUrl: `https://telegra.ph/file/0d429f2e958e66025438d.jpg`,
            sourceUrl: botConfig.saluran?.link || '',
            mediaType: 1,
            renderLargerThumbnail: true
        }
    }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    const prefix = botConfig.command?.prefix || '.'
    const user = db.getUser(m.sender) || { limit: 25 }
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
    
    let txt = `Hai *@${m.pushName || "User"}* 🪸\n`
    txt += `Aku *${botConfig.bot?.name || 'Ourin-AI'}*, bot WhatsApp yang siap membantu kamu.\n\n`

    txt += `— 🤖 *ʙᴏᴛ ɪɴꜰᴏ* 」\n`
    txt += `\`◦\` ᴠᴇʀsɪ: *v${botConfig.bot?.version || '1.9.0'}*\n`
    txt += `\`◦\` ᴍᴏᴅᴇ: *${(botConfig.mode || 'public').toUpperCase()}*\n`
    txt += `\`◦\` ᴘʀᴇꜰɪx: *[ ${prefix} ]*\n`
    txt += `\`◦\` ᴜᴘᴛɪᴍᴇ: *${uptimeFormatted}*\n`
    txt += `\`◦\` ᴛᴏᴛᴀʟ ᴜsᴇʀ: *${totalUsers}*\n`
    txt += `\`◦\` ᴛᴏᴛᴀʟ ꜰɪᴛᴜʀ: *${totalFeatures}*\n\n`
    
    txt += `— 👤 *ᴜsᴇʀ ɪɴꜰᴏ* 」\n`
    txt += `\`◦\` ʀᴏʟᴇ: *${roleEmoji} ${userRole}*\n`
    txt += `\`◦\` ʟɪᴍɪᴛ: *${m.isOwner || m.isPremium ? '∞ Unlimited' : (user.limit)}*\n\n`
    
    const categoryOrder = ['owner', 'main', 'utility', 'tools', 'fun', 'game', 'download', 'search', 'sticker', 'media', 'ai', 'group', 'religi', 'info', 'cek', 'economy', 'user', 'canvas', 'random', 'premium']
    const sortedCategories = [...categories].sort((a, b) => {
        const indexA = categoryOrder.indexOf(a)
        const indexB = categoryOrder.indexOf(b)
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB)
    })
    
    // Filter kategori berdasarkan mode bot
    for (const category of sortedCategories) {
        if (category === 'owner' && !m.isOwner) continue
        
        // MD Mode exclude
        if (botMode === 'md' && ['panel', 'pushkontak', 'store'].includes(category)) continue
        if (botMode === 'store' && !['main', 'group', 'sticker', 'owner', 'store'].includes(category)) continue

        const pluginCmds = commandsByCategory[category] || []
        const caseCmds = casesByCategory[category] || []
        const allCmds = [...new Set([...pluginCmds, ...caseCmds])].filter(c => c) // Hapus duplikat & null
        
        if (allCmds.length === 0) continue
        
        const emoji = CATEGORY_EMOJIS[category] || '📋'
        const categoryName = toSmallCaps(category)
        
        txt += `╭┈┈⬡「 ${emoji} *${categoryName}* 」\n`
        for (const cmd of allCmds) {
            txt += `┃ ◦ *${prefix}${cmd}*\n`
        }
        txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
    }
    
    txt += `_© ${botConfig.bot?.name || 'Ourin-AI'} | ${moment().tz('Asia/Jakarta').format('YYYY')}_\n`
    txt += `_ᴅᴇᴠᴇʟᴏᴘᴇʀ: ${botConfig.bot?.developer || 'Lucky Archz'}_`
    
    // Handler Gambar dengan Fallback
    const imagePath = path.join(process.cwd(), 'assets', 'images', 'ourin-allmenu.jpg')
    const fallbackPath = path.join(process.cwd(), 'assets', 'images', 'ourin.jpg')
    
    let menuImage;
    if (fs.existsSync(imagePath)) {
        menuImage = fs.readFileSync(imagePath)
    } else if (fs.existsSync(fallbackPath)) {
        menuImage = fs.readFileSync(fallbackPath)
    }

    try {
        if (menuImage) {
            await sock.sendMessage(m.chat, {
                image: menuImage,
                caption: txt,
                mentions: [m.sender],
                contextInfo: getContextInfo(botConfig, m)
            }, { quoted: m })
        } else {
            await m.reply(txt)
        }
    } catch (error) {
        console.error('[AllMenu] Send Error:', error.message)
        await m.reply(txt)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}