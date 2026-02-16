const axios = require('axios');
const cheerio = require('cheerio');
const qs = require('qs');

const pluginConfig = {
    name: 'pinterestdl',
    alias: ['pindl', 'pindownload'],
    category: 'download',
    description: 'Download gambar/video Pinterest',
    usage: '.pindl <url>',
    example: '.pindl https://www.pinterest.com/pin/xxx',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 1,
    isEnabled: true
}


const CONFIG = {
    BASE_URL: "https://pindown.cc",
    ENDPOINTS: {
        HOME: "/en/",
        DOWNLOAD: "/en/download"
    },
    HEADERS: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "max-age=0",
        "Upgrade-Insecure-Requests": "1",
        "Origin": "https://pindown.cc",
        "Referer": "https://pindown.cc/en/",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Dest": "document",
        "Priority": "u=0, i"
    }
};

const cleanText = (str) => {
    return str ? str.replace(/\s+/g, ' ').trim() : '';
};

const pindown = {
    download: async (pinUrl) => {
        try {
            if (!pinUrl) return { error: 'URL Pinterest tidak boleh kosong.' };
            const homeResponse = await axios.get(CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME, {
                headers: CONFIG.HEADERS
            });

            const cookies = homeResponse.headers['set-cookie'];
            const sessionCookie = cookies ? cookies.join('; ') : '';
            const $home = cheerio.load(homeResponse.data);
            const csrfToken = $home('input[name="csrf_token"]').val();

            if (!csrfToken) {
                return { error: 'Gagal mendapatkan CSRF Token.' };
            }

            const postData = qs.stringify({
                'csrf_token': csrfToken,
                'url': pinUrl
            });

            const downloadResponse = await axios.post(
                CONFIG.BASE_URL + CONFIG.ENDPOINTS.DOWNLOAD,
                postData,
                {
                    headers: {
                        ...CONFIG.HEADERS,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': sessionCookie,
                        'Referer': CONFIG.BASE_URL + CONFIG.ENDPOINTS.HOME
                    }
                }
            );

            const $ = cheerio.load(downloadResponse.data);
            const alertError = $('.alert-danger').text();
            if (alertError) {
                return { error: cleanText(alertError) };
            }

            const resultContainer = $('.square-box');
            if (resultContainer.length === 0) {
                return { error: 'Konten tidak ditemukan atau URL tidak valid.' };
            }

            const title = cleanText(resultContainer.find('.font-weight-bold').text());
            const duration = cleanText(resultContainer.find('.text-muted').text());
            const thumbnail = resultContainer.find('.square-box-img img').attr('src');
            
            const result = {
                title: title,
                duration: duration || null,
                thumbnail: thumbnail,
                medias: []
            };

            resultContainer.find('.square-box-btn a').each((i, el) => {
                const link = $(el).attr('href');
                const text = cleanText($(el).text());

                let type = 'unknown';
                if (text.includes('Video')) type = 'video';
                else if (text.includes('Image')) type = 'image';
                else if (text.includes('GIF')) type = 'gif';

                let ext = 'jpg';
                if (link.includes('.mp4')) ext = 'mp4';
                else if (link.includes('.gif')) ext = 'gif';
                else if (link.includes('.png')) ext = 'png';

                result.medias.push({
                    type: type,
                    extension: ext,
                    quality: text.replace('Download ', ''),
                    url: link
                });
            });

            return result;

        } catch (error) {
            console.error(`Pindown Error: ${error.message}`);
            if (error.response) {
                 console.error(`Status: ${error.response.status}`);
            }
            return { error: error.message };
        }
    }
};

async function handler(m, { sock }) {
    const url = m.text?.trim()
    
    if (!url) {
        return m.reply(
            `⚠️ *ᴄᴀʀᴀ ᴘᴀᴋᴀɪ*\n\n` +
            `> \`${m.prefix}pindl <url>\`\n\n` +
            `> Contoh:\n` +
            `> \`${m.prefix}pindl https://www.pinterest.com/pin/xxx\``
            `> \`${m.prefix}pindl https://pin.it/xxx\``
        )
    }

    // if(!url.includes('pin.it') || !url.includes('pinterest.com')) {
    //     return m.reply(`❌ URL tidak valid. Gunakan link Pinterest.`)
    // }
    
    await m.reply(`⏳ *ᴍᴇɴɢᴜɴᴅᴜʜ ᴍᴇᴅɪᴀ...*`)
    
    try {
        const data = await pindown.download(url)

        const medias = data.medias
        const isVideo = medias.find(media => media.type === 'video')
        const isImage = medias.find(media => media.type === 'image')
        const isGif = medias.find(media => media.type === 'gif')
        
        if (medias.length === 0) {
            return m.reply(`❌ *Media tidak ditemukan.*`)
        }

        if (isVideo) {
            await sock.sendMessage(m.chat, {
                video: { url: isVideo.url },
                mimeType: 'video/mp4',
                caption: `✅ *ᴘɪɴᴛᴇʀᴇsᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                    `> 🎬 Video\n` +
                    `> ${data.title || 'Unknown'}`
                }, { quoted: m })
            } else if (isGif) {
                await sock.sendMessage(m.chat, {
                    video: { url: isGif.url },
                    mimeType: 'video/mp4',
                    gifPlayback: true,
                    caption: `✅ *ᴘɪɴᴛᴇʀᴇsᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                        `> 🎬 Gif\n` +
                        `> ${data.title || 'Unknown'}`
                }, { quoted: m })
            } else if (isImage) {
                await sock.sendMessage(m.chat, {
                    image: { url: isImage.url },
                    caption: `✅ *ᴘɪɴᴛᴇʀᴇsᴛ ᴅᴏᴡɴʟᴏᴀᴅᴇʀ*\n\n` +
                        `> 🖼️ Gambar\n` +
                        `> ${data.title || 'Unknown'}`
                }, { quoted: m })
            } else {
                return m.reply(`❌ *Humm, kayaknya median nya agak lain*`)
            }
        
    } catch (err) {
        return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> ${err.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
