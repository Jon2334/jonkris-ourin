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
    description: 'Menampilkan semua command lengkap',
    usage: '.allmenu',
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

function toSmallCaps(text) {
    if (!text || typeof text !== 'string') return text || '';
    const smallCaps = {
        'a': 'ᴀ', 'b': 'ʙ', 'c': 'ᴄ', 'd': 'ᴅ', 'e': 'ᴇ', 'f': 'ꜰ', 'g': 'ɢ',
        'h': 'ʜ', 'i': 'ɪ', 'j': 'ᴊ', 'k': 'ᴋ', 'l': 'ʟ', 'm': 'ᴍ', 'n': 'ɴ',
        'o': 'ᴏ', 'p': 'ᴘ', 'q': 'ǫ', 'r': 'ʀ', 's': 's', 't': 'ᴛ', 'u': 'ᴜ',
        'v': 'ᴠ', 'w': 'ᴡ', 'x': 'x', 'y': 'ʏ', 'z': 'ᴢ'
    }
    return text.toLowerCase().split('').map(c => smallCaps[c] || c).join('')
}

async function handler(m, { sock, config: botConfig, db, uptime }) {
    try {
        // 1. Data Preparation (Null Safety)
        const prefix = botConfig?.command?.prefix ? String(botConfig.command.prefix) : '.';
        const user = db.getUser(m.sender) || {};
        
        let totalCommands = 0;
        const categories = getCategories();
        const commandsByCategory = getCommandsByCategory();
        const casesByCategory = getCasesByCategory();
        
        for (const category of categories) {
            if (commandsByCategory[category]) {
                totalCommands += commandsByCategory[category].length;
            }
        }
        
        // 2. Build Header
        const time = moment().tz('Asia/Jakarta').format('HH:mm:ss');
        const date = moment().tz('Asia/Jakarta').format('DD/MM/YYYY');
        const pushName = m.pushName || "User";
        
        let txt = `👋 Hai *${pushName}* (${user.role || 'User'})
🕒 ${time} | 📅 ${date}
📊 Limit: ${user.limit || 0} | 🤖 Ver: ${botConfig?.bot?.version || '1.0.0'}

`;

        // 3. Build Body
        const categoryOrder = ['main', 'ai', 'game', 'rpg', 'store', 'panel', 'group', 'downloader', 'tools', 'fun', 'sticker', 'owner'];
        const sortedCategories = [...categories].sort((a, b) => {
            let idxA = categoryOrder.indexOf(a.toLowerCase());
            let idxB = categoryOrder.indexOf(b.toLowerCase());
            if (idxA === -1) idxA = 99;
            if (idxB === -1) idxB = 99;
            return idxA - idxB;
        });

        for (const category of sortedCategories) {
            if (category === 'owner' && !m.isOwner) continue;
            
            // Gabungkan commands dari plugin dan case
            const pluginCmds = commandsByCategory[category] || [];
            const caseCmds = casesByCategory[category] || [];
            const allCmds = [...new Set([...pluginCmds, ...caseCmds])].filter(c => typeof c === 'string' && c.length > 0);
            
            if (allCmds.length === 0) continue;
            
            const emoji = CATEGORY_EMOJIS[category] || '📁';
            txt += `*${emoji} ${toSmallCaps(category).toUpperCase()}*
${allCmds.map(c => `› ${prefix}${c}`).join('\n')}
\n`;
        }

        txt += `_Powered by ${botConfig?.bot?.name || 'Ourin Bot'}_`;

        // 4. Image Handling (Safe Mode)
        const imagePath = path.join(process.cwd(), 'assets', 'images', 'ourin-allmenu.jpg');
        const backupPath = path.join(process.cwd(), 'assets', 'images', 'ourin.jpg');
        
        let finalBuffer = null;
        if (fs.existsSync(imagePath)) finalBuffer = fs.readFileSync(imagePath);
        else if (fs.existsSync(backupPath)) finalBuffer = fs.readFileSync(backupPath);

        // 5. Sending Message (Simplified ContextInfo to fix crash)
        if (finalBuffer) {
            await sock.sendMessage(m.chat, {
                image: finalBuffer,
                caption: txt,
                // Kita hapus externalAdReply yang kompleks karena sering memicu error null
                contextInfo: {
                    mentionedJid: [m.sender],
                    isForwarded: true,
                    forwardingScore: 999
                }
            }, { quoted: m });
        } else {
            // Fallback Text Only
            await sock.sendMessage(m.chat, {
                text: txt,
                contextInfo: {
                    mentionedJid: [m.sender]
                }
            }, { quoted: m });
        }

    } catch (e) {
        console.error("[AllMenu] Error:", e);
        // Kirim pesan error sederhana agar bot tidak diam saja
        await m.reply(`❌ Gagal memuat menu. Ketik ${botConfig?.command?.prefix || '.'}menu untuk menu sederhana.`);
    }
}

module.exports = {
    config: pluginConfig,
    handler
}