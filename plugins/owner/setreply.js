const config = require('../../config');
const { getDatabase } = require('../../src/lib/database');

const pluginConfig = {
    name: 'setreply',
    alias: ['replyvariant', 'replystyle'],
    category: 'owner',
    description: 'Mengatur variant tampilan reply',
    usage: '.setreply <v1/v2/v3/v4/v5>',
    example: '.setreply v5',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    limit: 0,
    isEnabled: true
};

const VARIANTS = {
    v1: { id: 1, name: 'Simple', desc: 'Reply text biasa tanpa styling', emoji: '📝' },
    v2: { id: 2, name: 'Context', desc: 'Reply dengan externalAdReply (thumbnail kecil)', emoji: '🖼️' },
    v3: { id: 3, name: 'Forward', desc: 'Full contextInfo + forwardedNewsletter', emoji: '📨' },
    v4: { id: 4, name: 'Qkontak', desc: 'V3 + fake quoted reply (centang biru)', emoji: '✅' },
    v5: { id: 5, name: 'FakeTroli', desc: 'V3 + faketroli quoted + large thumbnail', emoji: '🛒' }
};

async function handler(m, { sock, db }) {
    const args = m.args || [];
    const variant = args[0]?.toLowerCase();
    
    if (!variant) {
        const current = db.setting('replyVariant') || config.ui?.replyVariant || 1;
        
        let txt = `💬 *sᴇᴛ ʀᴇᴘʟʏ ᴠᴀʀɪᴀɴᴛ*\n\n`;
        txt += `> Variant saat ini: *V${current}*\n\n`;
        txt += `╭┈┈⬡「 📋 *ᴘɪʟɪʜᴀɴ* 」\n`;
        
        for (const [key, val] of Object.entries(VARIANTS)) {
            const mark = val.id === current ? ' ✓' : '';
            txt += `┃\n`;
            txt += `┃ ${val.emoji} *${key.toUpperCase()}*${mark}\n`;
            txt += `┃ └ _${val.desc}_\n`;
        }
        
        txt += `╰┈┈⬡\n\n`;
        txt += `> Gunakan: \`.setreply v1\` s/d \`.setreply v5\``;
        
        await m.reply(txt);
        return;
    }
    
    const selected = VARIANTS[variant];
    if (!selected) {
        await m.reply(`❌ Variant tidak valid!\n\nGunakan: v1, v2, v3, v4, atau v5`);
        return;
    }
    
    db.setting('replyVariant', selected.id);
    
    await m.reply(
        `✅ *ʀᴇᴘʟʏ ᴠᴀʀɪᴀɴᴛ ᴅɪᴜʙᴀʜ*\n\n` +
        `╭┈┈⬡「 ${selected.emoji} *V${selected.id}* 」\n` +
        `┃ Nama: *${selected.name}*\n` +
        `┃ Deskripsi: _${selected.desc}_\n` +
        `╰┈┈⬡`
    );
}

module.exports = {
    config: pluginConfig,
    handler
};
