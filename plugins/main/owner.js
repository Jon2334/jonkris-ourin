const config = require('../../config');

const pluginConfig = {
    name: 'owner',
    alias: ['creator', 'dev', 'developer'],
    category: 'main',
    description: 'Menampilkan kontak owner bot',
    usage: '.owner',
    example: '.owner',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 0,
    isEnabled: true
};

async function handler(m, { sock, config: botConfig }) {
    const ownerNumbers = botConfig.owner?.number || ['6281234567890'];
    const ownerName = botConfig.owner?.name || 'Owner';
    const botName = botConfig.bot?.name || 'Ourin-AI';
    
    const ownerText = `👑 *ᴏᴡɴᴇʀ ɪɴꜰᴏʀᴍᴀᴛɪᴏɴ*

╭┈┈⬡「 📋 *ᴅᴇᴛᴀɪʟ* 」
┃ ㊗ ɴᴀᴍᴀ: *${ownerName}*
┃ ㊗ ʙᴏᴛ: *${botName}*
┃ ㊗ sᴛᴀᴛᴜs: *🟢 Online*
╰┈┈⬡

> _Jika ada pertanyaan atau kendala,_
> _silakan hubungi owner di atas!_
> _📞 Contact card di bawah._`;
    
    await m.reply(ownerText);
    
    for (const number of ownerNumbers) {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        
        const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${ownerName} (Owner ${botName})
TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}
END:VCARD`;
        
        await sock.sendMessage(m.chat, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: m.raw });
    }
}

module.exports = {
    config: pluginConfig,
    handler
};
