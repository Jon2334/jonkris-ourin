const axios = require('axios')
const config = require('../../config')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')
const NEOXR_APIKEY = config.APIkey?.neoxr || 'Milik-Bot-OurinMD'
const { exec } = require('child_process')
const { promisify } = require('util')
const path = require('path')
const fs = require('fs')
const execAsync = promisify(exec)

const pluginConfig = {
    name: 'ytmp3',
    alias: ['youtubemp3', 'ytaudio'],
    category: 'download',
    description: 'Download audio YouTube',
    usage: '.ytmp3 <url>',
    example: '.ytmp3 https://youtube.com/watch?v=xxx',
    cooldown: 20,
    limit: 2,
    isEnabled: true
}


async function run(type, url) {
  while (true) {
    const res = await fetch(`https://youtubedl.siputzx.my.id/download?type=${type}&url=${url}`, {
      headers: { "Accept": "application/json, text/plain, */*" }
    })
    const data = await res.json()
    if (data.status === "completed") {
      return "https://youtubedl.siputzx.my.id" + data.fileUrl
    }
  }
}

async function handler(m, { sock }) {
    const url = m.text?.trim()
    if (!url) return m.reply(`Contoh: ${m.prefix}ytmp4 https://youtube.com/watch?v=xxx`)
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) return m.reply('❌ URL harus YouTube')

    m.react('🎬')

    try {
        const audioUrl = await run('audio', url)
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        await sock.sendMessage(m.chat, {
            audio: { url: audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false,
            contextInfo: {
                forwardingScore: 9999,
                isForwarded: true,
            }           
        }, { quoted: m })
        m.react('✅')

    } catch (err) {
        console.error('[YTMP4]', err)
        m.react('❌')
        m.reply('Gagal mengunduh video.')
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
