const axios = require('axios')
const moment = require('moment-timezone')
const config = require('../../config')
const fs = require('fs')

const pluginConfig = {
    name: 'jadwalsholat',
    alias: ['sholat', 'prayertime', 'jadwalsolat', 'waktusolat', 'waktusholat'],
    category: 'religi',
    description: 'Menampilkan jadwal sholat dengan adzan',
    usage: '.jadwalsholat <kota>',
    example: '.jadwalsholat Jakarta',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 5,
    limit: 0,
    isEnabled: true
}

const cityMapping = {
    'jakarta': 1301, 'bandung': 1501, 'surabaya': 1601, 'semarang': 1518,
    'yogyakarta': 1520, 'medan': 1204, 'makassar': 1901, 'palembang': 1601,
    'tangerang': 1301, 'depok': 1301, 'bekasi': 1301, 'bogor': 1301,
    'malang': 1519, 'batam': 2101, 'pekanbaru': 1401, 'denpasar': 1701,
    'padang': 1301, 'banjarmasin': 1801, 'pontianak': 1701, 'samarinda': 1601
}

async function getSchedule(city) {
    try {
        const cityId = cityMapping[city.toLowerCase()] || 1301
        const today = moment.tz('Asia/Jakarta').format('YYYY-MM-DD')
        
        const res = await axios.get(`https://api.myquran.com/v2/sholat/jadwal/${cityId}/${today}`, { timeout: 10000 })
        
        if (res.data?.status && res.data?.data?.jadwal) {
            return { success: true, data: res.data.data.jadwal, location: res.data.data.lokasi || city }
        }
        
        const today2 = moment.tz('Asia/Jakarta').format('DD-MM-YYYY')
        const res2 = await axios.get(`https://api.aladhan.com/v1/timingsByCity/${today2}`, {
            params: { city, country: 'Indonesia', method: 20 }, timeout: 10000
        })
        
        if (res2.data?.code === 200 && res2.data?.data?.timings) {
            const t = res2.data.data.timings
            return {
                success: true,
                data: {
                    imsak: t.Imsak?.substring(0,5) || '-', subuh: t.Fajr?.substring(0,5) || '-',
                    terbit: t.Sunrise?.substring(0,5) || '-', dhuha: t.Dhuha?.substring(0,5) || '-',
                    dzuhur: t.Dhuhr?.substring(0,5) || '-', ashar: t.Asr?.substring(0,5) || '-',
                    maghrib: t.Maghrib?.substring(0,5) || '-', isya: t.Isha?.substring(0,5) || '-'
                },
                location: city
            }
        }
        
        return { success: false, error: 'Data tidak ditemukan' }
    } catch (e) {
        return { success: false, error: e.message }
    }
}

async function handler(m, { sock }) {
    const city = m.args.join(' ').trim() || 'Jakarta'
    
    m.react('🕌')
    
    try {
        const result = await getSchedule(city)
        
        if (!result.success) {
            m.react('❌')
            return m.reply(`❌ *ɢᴀɢᴀʟ*\n\n> Tidak bisa mendapatkan jadwal untuk \"${city}\"`)
        }
        
        const schedule = result.data
        const location = result.location
        const today = moment.tz('Asia/Jakarta').format('dddd, DD MMMM YYYY')
        
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        let thumbnail = null
        try {
            if (fs.existsSync('./assets/images/ourin.jpg')) {
                thumbnail = fs.readFileSync('./assets/images/ourin.jpg')
            }
        } catch {}
        
        const caption = `🕌 *ᴊᴀᴅᴡᴀʟ sʜᴏʟᴀᴛ*

╭┈┈⬡「 📍 *${location}* 」
┃ 📅 ${today}
╰┈┈⬡

╭┈┈⬡「 ⏰ *ᴡᴀᴋᴛᴜ sʜᴏʟᴀᴛ* 」
┃ 🌙 ɪᴍsᴀᴋ: \`${schedule.imsak || '-'}\`
┃ 🌅 sᴜʙᴜʜ: \`${schedule.subuh || '-'}\`
┃ ☀️ ᴛᴇʀʙɪᴛ: \`${schedule.terbit || '-'}\`
┃ 🌤️ ᴅʜᴜʜᴀ: \`${schedule.dhuha || '-'}\`
┃ 🌞 ᴅᴢᴜʜᴜʀ: \`${schedule.dzuhur || '-'}\`
┃ 🌇 ᴀsʜᴀʀ: \`${schedule.ashar || '-'}\`
┃ 🌆 ᴍᴀɢʜʀɪʙ: \`${schedule.maghrib || '-'}\`
┃ 🌃 ɪsʏᴀ: \`${schedule.isya || '-'}\`
╰┈┈⬡

> _Jangan lupa sholat ya! 🤲_`
        
        const adzanUrl = 'https://files.catbox.moe/z2bj5s.mp3'
        let adzanBuffer
        try {
            const res = await axios.get(adzanUrl, { responseType: 'arraybuffer', timeout: 30000 })
            adzanBuffer = Buffer.from(res.data)
        } catch {
            adzanBuffer = null
        }
        
        if (adzanBuffer) {
            await sock.sendMessage(m.chat, {
                audio: adzanBuffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: `🕌 Jadwal Sholat - ${location}`,
                        body: caption.substring(0, 100) + '...',
                        thumbnail,
                        sourceUrl: config.saluran?.link || '',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 9999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: saluranId,
                        newsletterName: saluranName,
                        serverMessageId: 127
                    }
                }
            }, { quoted: m })
            
            await sock.sendMessage(m.chat, { text: caption }, { quoted: m })
        } else {
            await sock.sendMessage(m.chat, {
                text: caption,
                contextInfo: {
                    externalAdReply: {
                        title: `🕌 Jadwal Sholat - ${location}`,
                        body: 'Waktu sholat hari ini',
                        thumbnail,
                        sourceUrl: config.saluran?.link || '',
                        mediaType: 1,
                        renderLargerThumbnail: true
                    },
                    forwardingScore: 9999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: saluranId,
                        newsletterName: saluranName,
                        serverMessageId: 127
                    }
                }
            }, { quoted: m })
        }
        
        m.react('✅')
        
    } catch (error) {
        m.react('❌')
        m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
