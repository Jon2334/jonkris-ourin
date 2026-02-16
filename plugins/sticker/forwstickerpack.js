const timeHelper = require("../../src/lib/timeHelper");

const pluginConfig = {
  name: "forwstickerpack",
  alias: ["fwsp", "forwardpack", "packfwd"],
  category: "sticker",
  description: "Forward sticker pack yang tersimpan",
  usage: ".forwstickerpack [list|<packId>]",
  example: ".forwstickerpack list",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  limit: 1,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const args = m.args || [];
  const action = args[0]?.toLowerCase() || "list";

  if (!sock.forwardStickerPack || !sock.getSavedPacks) {
    return m.reply("❌ Fitur forward sticker pack tidak tersedia");
  }

  if (action === "list") {
    const packs = sock.getSavedPacks();

    if (packs.length === 0) {
      return m.reply(
        `📦 *sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ ᴄᴀᴄʜᴇ*\n\n` +
          `> Belum ada sticker pack tersimpan!\n\n` +
          `💡 *ᴄᴀʀᴀ ᴍᴇɴʏɪᴍᴘᴀɴ:*\n` +
          `> Minta seseorang kirim sticker pack ke chat dimana bot ada\n` +
          `> Bot akan otomatis menyimpan pack tersebut`,
      );
    }

    let list = `📦 *sᴛɪᴄᴋᴇʀ ᴘᴀᴄᴋ ᴛᴇʀsɪᴍᴘᴀɴ*\n\n`;
    list += `Total: ${packs.length} pack(s)\n\n`;

    for (let i = 0; i < packs.length; i++) {
      const p = packs[i];
      const date = timeHelper.fromTimestamp(p.savedAt, "DD/MM/YYYY");
      list += `╭┈┈⬡「 📦 *${i + 1}* 」\n`;
      list += `┃ 📝 *Nama:* ${p.name}\n`;
      list += `┃ 🆔 *ID:* ${p.id.substring(0, 12)}...\n`;
      list += `┃ 📅 *Saved:* ${date}\n`;
      list += `╰┈┈┈┈┈┈┈┈⬡\n\n`;
    }

    list += `💡 *Forward pack:*\n`;
    list += `> ${m.prefix}forwstickerpack <packId>`;

    return m.reply(list);
  }

  await m.react("⏳");

  try {
    const packId = action;
    await sock.forwardStickerPack(m.chat, packId, m);
    await m.react("✅");
  } catch (error) {
    console.error("[ForwStickerPack] Error:", error.message);
    await m.react("❌");
    await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`);
  }
}

module.exports = {
  config: pluginConfig,
  handler,
};
