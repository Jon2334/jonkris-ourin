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

// Fungsi helper string aman dengan type checking ketat
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

// Fungsi aman untuk mendapatkan context info tanpa nilai null/undefined
function getContextInfo(botConfig, m) {
    // Pastikan semua nilai adalah string valid atau undefined (jika opsional)
    // Jangan biarkan ada nilai null lolos
    const saluranId = (botConfig.saluran && botConfig.saluran.id) ? String(botConfig.saluran.id) : '120363208449943317@newsletter';
    const saluranName = (botConfig.saluran && botConfig.saluran.name) ? String(botConfig.saluran.name) : 'Ourin-AI';
    const saluranLink = (botConfig.saluran && botConfig.saluran.link) ? String(botConfig.saluran.link) : 'https://whatsapp.com/channel/0029VaG9VfPKWEKk1rxTQD20';

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
            title: 'Ourin-AI Multi Device',
            body: 'Simple WhatsApp Bot by Jonkris',
            thumbnailUrl: 'https://telegra.ph/file/0d429f2e958e66025438d.jpg', // Pastikan URL valid
            sourceUrl: saluranLink,
            mediaType: 1,
            renderLargerThumbnail: true
        }
    }
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    try {
        const prefix = (botConfig.command && botConfig.command.prefix) ? String(botConfig.command.prefix) : '.';
        
        // Null safety untuk user & group
        let user = db.getUser(m.sender);
        if (!user) user = {}; // Fallback object
        
        let groupData = {};
        if (m.isGroup) {
            groupData = db.getGroup(m.chat) || {};
        }
        
        const botMode = groupData.botMode || 'md';
        
        const categories = getCategories();
        const commandsByCategory = getCommandsByCategory();
        const casesByCategory = getCasesByCategory();
        
        let totalCommands = 0;
        for (const category of categories) {
            if (commandsByCategory[category]) {
                totalCommands += commandsByCategory[category].length;
            }
        }
        const totalCases = getCaseCount();
        const totalFeatures = totalCommands + totalCases;
        
        let userRole = 'User';
        let roleEmoji = '👤';
        
        if (m.isOwner) { 
            userRole = 'Owner'; 
            roleEmoji = '👑'; 
        } else if (m.isPremium) { 
            userRole = 'Premium'; 
            roleEmoji = '💎'; 
        }
        
        const greeting = getTimeGreeting();
        const uptimeFormatted = formatUptime(uptime);
        const totalUsers = db.getUserCount();
        const userName = m.pushName || "User";
        const botName = (botConfig.bot && botConfig.bot.name) ? botConfig.bot.name : 'Ourin-AI';
        const botVersion = (botConfig.bot && botConfig.bot.version) ? botConfig.bot.version : '1.9.0';
        const botModeStr = (botConfig.mode || 'public').toUpperCase();
        
        // Membangun String Menu
        let txt = `Hai *@${userName}* 🪸\n`;
        txt += `Aku *${botName}*, bot WhatsApp yang siap membantu kamu.\n\n`;

        txt += `— 🤖 *ʙᴏᴛ ɪɴꜰᴏ* 」\n`;
        txt += `\`◦\` ɴᴀᴍᴀ: *${botName}*\n`;
        txt += `\`◦\` ᴠᴇʀsɪ: *v${botVersion}*\n`;
        txt += `\`◦\` ᴍᴏᴅᴇ: *${botModeStr}*\n`;
        txt += `\`◦\` ᴘʀᴇꜰɪx: *[ ${prefix} ]*\n`;
        txt += `\`◦\` ᴜᴘᴛɪᴍᴇ: *${uptimeFormatted}*\n`;
        txt += `\`◦\` ᴛᴏᴛᴀʟ ᴜsᴇʀ: *${totalUsers}*\n`;
        txt += `\`◦\` ᴛᴏᴛᴀʟ ꜰɪᴛᴜʀ: *${totalFeatures}*\n\n`;
        
        txt += `— 👤 *ᴜsᴇʀ ɪɴꜰᴏ* 」\n`;
        txt += `\`◦\` ɴᴀᴍᴀ: *${userName}*\n`;
        txt += `\`◦\` ʀᴏʟᴇ: *${roleEmoji} ${userRole}*\n`;
        txt += `\`◦\` ʟɪᴍɪᴛ: *${(m.isOwner || m.isPremium) ? '∞ Unlimited' : (user.limit || 25)}*\n\n`;
        
        // Sorting Kategori
        const categoryOrder = ['owner', 'main', 'utility', 'tools', 'fun', 'game', 'download', 'search', 'sticker', 'media', 'ai', 'group', 'religi', 'info', 'cek', 'economy', 'user', 'canvas', 'random', 'premium', 'panel', 'store', 'jpm', 'pushkontak', 'convert', 'ephoto', 'vps', 'linode'];
        const sortedCategories = [...categories].sort((a, b) => {
            const indexA = categoryOrder.indexOf(a);
            const indexB = categoryOrder.indexOf(b);
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
        
        // Loop Categories
        for (const category of sortedCategories) {
            // Filter hak akses
            if (category === 'owner' && !m.isOwner) continue;
            
            // Filter mode bot (md/store/pushkontak)
            if (botMode === 'md' && ['panel', 'pushkontak', 'store'].includes(category)) continue;
            if (botMode === 'store' && !['main', 'group', 'sticker', 'owner', 'store'].includes(category)) continue;

            const pluginCmds = commandsByCategory[category] || [];
            const caseCmds = casesByCategory[category] || [];
            // Gabung & filter null/duplicate
            // Pastikan setiap cmd adalah string sebelum masuk ke Set
            const allCmds = [...new Set([...pluginCmds, ...caseCmds])]
                .filter(c => c && typeof c === 'string');
            
            if (allCmds.length === 0) continue;
            
            const emoji = CATEGORY_EMOJIS[category] || '📋';
            const categoryName = toSmallCaps(category);
            
            txt += `╭┈┈⬡「 ${emoji} *${categoryName}* 」\n`;
            for (const cmd of allCmds) {
                txt += `┃ ◦ *${prefix}${toSmallCaps(cmd)}*\n`;
            }
            txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`;
        }
        
        const year = moment().tz('Asia/Jakarta').format('YYYY');
        const developer = (botConfig.bot && botConfig.bot.developer) ? botConfig.bot.developer : 'Lucky Archz';
        txt += `_© ${botName} | ${year}_\n`;
        txt += `_ᴅᴇᴠᴇʟᴏᴘᴇʀ: ${developer}_`;
        
        // --- LOGIKA GAMBAR DENGAN PROTEKSI GANDA ---
        
        const imagePath = path.join(process.cwd(), 'assets', 'images', 'ourin-allmenu.jpg');
        const fallbackPath = path.join(process.cwd(), 'assets', 'images', 'ourin.jpg');
        
        let buffer = null;
        try {
            if (fs.existsSync(imagePath)) {
                buffer = fs.readFileSync(imagePath);
            } else if (fs.existsSync(fallbackPath)) {
                buffer = fs.readFileSync(fallbackPath);
            }
        } catch (e) {
            console.error('[AllMenu] Error reading image file:', e);
            buffer = null;
        }

        // Context Info
        const contextInfo = getContextInfo(botConfig, m);

        // 3. Kirim Pesan - CABANG LOGIKA UTAMA
        if (buffer && Buffer.isBuffer(buffer)) {
            // Jika buffer VALID, kirim IMAGE
            await sock.sendMessage(m.chat, {
                image: buffer,
                caption: txt,
                contextInfo: contextInfo
            }, { quoted: m });
        } else {
            // Jika buffer NULL/INVALID, kirim TEXT saja
            // PENTING: Jangan sertakan property 'image': null
            await sock.sendMessage(m.chat, {
                text: txt,
                contextInfo: contextInfo
            }, { quoted: m });
        }

    } catch (error) {
        console.error('[AllMenu] Critical Error:', error);
        await sock.sendMessage(m.chat, { text: `❌ Terjadi kesalahan: ${error.message}` }, { quoted: m });
    }
}

module.exports = {
    config: pluginConfig,
    handler
}