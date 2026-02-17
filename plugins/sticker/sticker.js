const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('../../src/lib/exif');
const config = require('../../config');

const execAsync = promisify(exec);

// --- Helper Functions untuk Parsing Options ---
function parseOptions(args) {
    const options = {
        crop: false,
        resize: null,
        circle: false,
        rounded: false,
        packname: null,
        author: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--crop' || arg === '-c') {
            options.crop = true;
        } else if (arg === '--resize' || arg === '-r') {
            if (args[i + 1] && /^\d+x\d+$/i.test(args[i + 1])) {
                options.resize = args[i + 1];
                i++;
            }
        } else if (arg === '--circle') {
            options.circle = true;
        } else if (arg === '--rounded') {
            options.rounded = true;
        } else if (!arg.startsWith('-') && !options.packname) {
            options.packname = arg;
        } else if (!arg.startsWith('-') && options.packname && !options.author) {
            options.author = arg;
        }
    }
    return options;
}

// --- Proses Image dengan FFmpeg ---
async function processImage(inputPath, outputPath, options) {
    let filters = [];

    // Resize Custom
    if (options.resize) {
        const [width, height] = options.resize.split('x').map(Number);
        filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
        filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x00000000`);
    }

    // Auto Crop Square
    if (options.crop) {
        filters.push(`crop='min(iw,ih)':'min(iw,ih)'`);
        filters.push(`scale=512:512`);
    }

    // Circle Shape
    if (options.circle) {
        filters.push(`format=rgba`);
        filters.push(`geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(pow(X-W/2,2)+pow(Y-H/2,2),pow(min(W,H)/2,2)),0,255)'`);
    }

    // Jika tidak ada filter, copy saja file aslinya
    if (filters.length === 0) {
        // Default scale agar tidak terlalu besar
        filters.push('scale=512:512:force_original_aspect_ratio=decrease');
    }

    const filterStr = filters.join(',');
    await execAsync(`ffmpeg -i "${inputPath}" -vf "${filterStr}" -y "${outputPath}"`);
}

// --- Proses Video dengan FFmpeg ---
async function processVideo(inputPath, outputPath, options) {
    let filters = [];

    if (options.resize) {
        const [width, height] = options.resize.split('x').map(Number);
        filters.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
        filters.push(`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`);
    }

    if (options.crop) {
        filters.push(`crop='min(iw,ih)':'min(iw,ih)'`);
        filters.push(`scale=512:512`);
    }
    
    // Default scale for video to sticker standard
    if (filters.length === 0) {
       filters.push('scale=512:512:force_original_aspect_ratio=decrease');
       filters.push('pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000');
    }

    const filterStr = filters.join(',');
    // -an to remove audio, -loop 0 for infinite loop usually handled by converter but good to enforce
    await execAsync(`ffmpeg -i "${inputPath}" -vf "${filterStr}" -c:v libwebp -loop 0 -ss 00:00:00 -t 00:00:10 -preset default -an -vsync 0 -s 512:512 -y "${outputPath}"`);
}

module.exports = {
    type: 'sticker',
    command: ['sticker', 's', 'stiker', 'sgif'],
    operate: async (context) => {
        const {
            m,
            sock,
            q,
            msg,
            isMedia,
            isQuotedMedia,
            args,
            usedPrefix,
            command
        } = context;

        try {
            // Cek apakah ada media
            const target = isQuotedMedia ? m.quoted : (isMedia ? m : null);
            
            if (!target) {
                return m.reply(
                    `🖼️ *sᴛɪᴄᴋᴇʀ ᴍᴀᴋᴇʀ*\n\n` +
                    `Kirim/reply gambar atau video dengan caption:\n` +
                    `\`${usedPrefix + command}\`\n\n` +
                    `*ᴏᴘsɪ:*\n` +
                    `> \`--crop\` - Crop jadi kotak\n` +
                    `> \`--resize WxH\` - Resize ke ukuran\n` +
                    `> \`--circle\` - Bentuk lingkaran\n\n` +
                    `*ᴄᴏɴᴛᴏʜ:*\n` +
                    `> \`${usedPrefix}s --crop\`\n` +
                    `> \`${usedPrefix}s --resize 256x256\`\n` +
                    `> \`${usedPrefix}s --circle\`\n` +
                    `> \`${usedPrefix}s PackName Author\``
                );
            }

            await sock.sendMessage(m.chat, { react: { text: "⏳", key: m.key } });

            // Parsing Options dari Argumen
            const options = parseOptions(args || []);
            let packname = options.packname || global.packname || config.packname || 'Jonkris';
            let author = options.author || global.author || config.author || 'Bot';

            // Download Media
            let buffer = await target.download();
            if (!buffer) throw new Error('Gagal mendownload media');

            const isVideo = /video/.test(target.mimetype);
            const isImage = /image/.test(target.mimetype);

            // Setup Direktori Temp
            const tempDir = path.join(process.cwd(), 'tmp'); // Menggunakan folder tmp yang sudah ada di struktur bot
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const ext = isVideo ? 'mp4' : 'png';
            const inputPath = path.join(tempDir, `stick_in_${Date.now()}_${Math.random()}.${ext}`);
            const outputPath = path.join(tempDir, `stick_out_${Date.now()}_${Math.random()}.${isVideo ? 'webp' : 'png'}`); // Jika video langsung ke webp lewat ffmpeg, jika image ke png dulu baru exif

            // Tulis buffer ke file
            fs.writeFileSync(inputPath, buffer);

            // Proses menggunakan FFmpeg jika ada opsi atau untuk standarisasi
            try {
                if (isVideo) {
                    // Validasi durasi
                    if (target.seconds > 10) {
                        fs.unlinkSync(inputPath);
                        return m.reply('❌ Durasi video maksimal 10 detik!');
                    }
                    await processVideo(inputPath, outputPath, options);
                    // Baca hasil olahan ffmpeg (sudah webp)
                    buffer = fs.readFileSync(outputPath);
                    
                    // Tambahkan Metadata Exif ke WebP
                    // Gunakan writeExifVid atau fallback ke videoToWebp jika buffer belum valid webp
                    let bufferWithExif = await writeExifVid(buffer, { packname, author });
                    if (!bufferWithExif) bufferWithExif = await videoToWebp(buffer); // Fallback converter
                    
                    // Kirim
                    await sock.sendMessage(m.chat, { sticker: bufferWithExif }, { quoted: m });

                } else if (isImage) {
                    await processImage(inputPath, outputPath, options);
                    // Baca hasil olahan ffmpeg
                    buffer = fs.readFileSync(outputPath);
                    
                    // Konversi ke Sticker WebP + Metadata
                    let bufferWithExif = await writeExifImg(buffer, { packname, author });
                    if (!bufferWithExif) bufferWithExif = await imageToWebp(buffer); // Fallback converter

                    // Kirim
                    await sock.sendMessage(m.chat, { sticker: bufferWithExif }, { quoted: m });
                }
            } catch (errProcess) {
                console.error('Error processing media:', errProcess);
                m.reply('❌ Gagal memproses media dengan FFmpeg.');
            } finally {
                // Cleanup file sementara
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            }

            await sock.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

        } catch (e) {
            console.error(e);
            m.reply(`❌ Error: ${e.message}`);
            await sock.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
        }
    }
};