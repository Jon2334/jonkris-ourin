const { hdv3, uploadToTempfiles } = require('../../src/scraper/hd')
const axios = require('axios')
const config = require('../../config')
const sharp = require('sharp')
const FormData = require('form-data')

const pluginConfig = {
    name: ['ourinupscale', 'hdsuper', 'inhancer'],
    alias: [],
    category: 'tools',
    description: 'Enhance gambar menjadi HD dengan AI',
    usage: '.hdsuper (reply gambar)',
    example: '.hdsuper',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 30,
    limit: 2,
    isEnabled: true
}

async function ihancer(buffer, method = 1, size = "low") {
  const _size = ["low", "medium", "high"];

  if (method < 1 || method > 4) method = 1;
  if (!_size.includes(size)) size = "low";

  try {
    const form = new FormData();
    form.append("method", method.toString());
    form.append("is_pro_version", "false");
    form.append("is_enhancing_more", "false");
    form.append("max_image_size", size);
    form.append("file", buffer, `image_${Date.now()}.jpg`);

    const { data } = await axios.post("https://ihancer.com/api/enhance", form, {
      headers: {
        ...form.getHeaders(),
        "accept-encoding": "gzip",
        "host": "ihancer.com",
        "user-agent": "Dart/3.5 (dart:io)",
      },
      responseType: "arraybuffer",
    });

    return data;
  } catch (error) {
    console.error("Ihancer Error:", error.message);
    throw new Error("Gagal memproses gambar. Pastikan URL valid atau server sedang sibuk.");
  }
}

async function handler(m, { sock }) {
    const isImage = m.isImage || (m.quoted && m.quoted.type === 'imageMessage')

    if (!isImage) {
        return m.reply(`✨ *ᴏᴜʀɪɴ ᴜᴘꜱᴄᴀʟᴇ*\n\n> Kirim/reply gambar untuk di-enhance\n\n\`${m.prefix}ourinupscale\`\n\n> ⏳ Proses membutuhkan waktu beberapa detik`)
    }

    m.react('⏳')

    try {
        let buffer
        if (m.quoted && m.quoted.isMedia) {
            buffer = await m.quoted.download()
        } else if (m.isMedia) {
            buffer = await m.download()
        }

        if (!buffer) {
            m.react('❌')
            return m.reply(`❌ Gagal mendownload gambar`)
        }

        const buffers = await ihancer(buffer, 2, "high")
        await new Promise(resolve => setTimeout(resolve, 2000))
        const buffers2 = await ihancer(buffers, 2, "high")

        m.react('✅')

        await sock.sendMessage(m.chat, {
            image: buffers2,
            caption: `✨ *ᴏᴜʀɪɴ ᴜᴘꜱᴄᴀʟᴇ*\n\n> Berhasil di-enhance menggunakan Ourin Upscale AI.`,
        }, { quoted: m })

    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
