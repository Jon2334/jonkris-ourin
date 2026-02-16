const { getAllPlugins } = require('../../src/lib/plugins')
const { createCanvas } = require('@napi-rs/canvas')
const config = require('../../config')

const pluginConfig = {
    name: 'totalfitur',
    alias: ['totalfeature', 'totalcmd', 'countplugin', 'distribusi'],
    category: 'main',
    description: 'Lihat total fitur/command bot dengan chart modern',
    usage: '.totalfitur',
    example: '.totalfitur',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 0,
    isEnabled: true
}

const THEME = {
    bg: '#0d1117',
    bgCard: '#161b22',
    accent: '#58a6ff',
    success: '#3fb950',
    warning: '#d29922',
    danger: '#f85149',
    textPrimary: '#f0f6fc',
    textSecondary: '#8b949e',
    border: '#30363d',
    barColors: ['#58a6ff', '#3fb950', '#a371f7', '#f0883e', '#db61a2', '#39c5cf', '#d29922', '#f85149']
}

async function createModernChart(categories, totalCommands) {
    const sorted = Object.entries(categories).sort((a, b) => b[1].total - a[1].total).slice(0, 8)
    
    const W = 800
    const H = 600
    const canvas = createCanvas(W, H)
    const ctx = canvas.getContext('2d')
    
    const bgGradient = ctx.createLinearGradient(0, 0, W, H)
    bgGradient.addColorStop(0, '#0d1117')
    bgGradient.addColorStop(0.5, '#161b22')
    bgGradient.addColorStop(1, '#0d1117')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, W, H)
    
    ctx.globalAlpha = 0.03
    ctx.strokeStyle = THEME.accent
    for (let i = 0; i < W; i += 40) {
        ctx.beginPath()
        ctx.moveTo(i, 0)
        ctx.lineTo(i, H)
        ctx.stroke()
    }
    for (let i = 0; i < H; i += 40) {
        ctx.beginPath()
        ctx.moveTo(0, i)
        ctx.lineTo(W, i)
        ctx.stroke()
    }
    ctx.globalAlpha = 1
    
    ctx.save()
    ctx.shadowColor = THEME.accent
    ctx.shadowBlur = 20
    ctx.fillStyle = THEME.accent
    ctx.font = 'bold 36px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('📊 DISTRIBUSI FITUR', W / 2, 55)
    ctx.restore()
    
    ctx.fillStyle = THEME.textSecondary
    ctx.font = '16px Arial'
    ctx.fillText(`Total ${totalCommands} fitur tersedia`, W / 2, 85)
    
    const startY = 130
    const barHeight = 45
    const barGap = 55
    const barMaxWidth = 500
    const leftPad = 150
    const maxVal = Math.max(...sorted.map(([, d]) => d.total))
    
    sorted.forEach(([cat, data], i) => {
        const y = startY + i * barGap
        const pct = ((data.total / totalCommands) * 100).toFixed(1)
        const barWidth = (data.total / maxVal) * barMaxWidth
        const color = THEME.barColors[i % THEME.barColors.length]
        
        ctx.fillStyle = THEME.textPrimary
        ctx.font = 'bold 14px Arial'
        ctx.textAlign = 'right'
        ctx.fillText(cat.toUpperCase(), leftPad - 15, y + 18)
        
        ctx.beginPath()
        ctx.roundRect(leftPad, y, barMaxWidth, 28, 6)
        ctx.fillStyle = THEME.border
        ctx.fill()
        
        if (barWidth > 8) {
            ctx.save()
            ctx.shadowColor = color
            ctx.shadowBlur = 8
            const barGrad = ctx.createLinearGradient(leftPad, 0, leftPad + barWidth, 0)
            barGrad.addColorStop(0, color)
            barGrad.addColorStop(1, color + 'aa')
            ctx.beginPath()
            ctx.roundRect(leftPad, y, barWidth, 28, 6)
            ctx.fillStyle = barGrad
            ctx.fill()
            ctx.restore()
        }
        
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'left'
        if (barWidth > 50) {
            ctx.fillText(`${data.total}`, leftPad + 10, y + 19)
        }
        
        ctx.fillStyle = THEME.textSecondary
        ctx.font = '12px Arial'
        ctx.textAlign = 'left'
        ctx.fillText(`${pct}%`, leftPad + barMaxWidth + 15, y + 19)
    })
    
    const footerY = H - 50
    ctx.fillStyle = THEME.bgCard
    ctx.fillRect(0, footerY - 20, W, 70)
    
    ctx.fillStyle = THEME.accent
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.fillText(`⚡ ${totalCommands} COMMANDS`, W / 2, footerY + 10)
    
    ctx.fillStyle = THEME.textSecondary
    ctx.font = '12px Arial'
    ctx.fillText(`${config.bot?.name || 'Ourin-AI'} • ${require('moment-timezone')().tz('Asia/Jakarta').format('DD/MM/YYYY')}`, W / 2, footerY + 35)
    
    return canvas.toBuffer('image/png')
}

async function handler(m, { sock }) {
    try {
        const allPlugins = getAllPlugins()
        
        const categories = {}
        let totalCommands = 0
        
        for (const plugin of allPlugins) {
            if (!plugin.config) continue
            
            const cat = plugin.config.category || 'other'
            if (!categories[cat]) {
                categories[cat] = { total: 0, enabled: 0 }
            }
            
            categories[cat].total++
            totalCommands++
            
            if (plugin.config.isEnabled !== false) {
                categories[cat].enabled++
            }
        }
        
        await m.react('📊')
        
        const chartBuffer = await createModernChart(categories, totalCommands)
        
        const saluranId = config.saluran?.id || '120363208449943317@newsletter'
        const saluranName = config.saluran?.name || config.bot?.name || 'Ourin-AI'
        
        const sorted = Object.entries(categories).sort((a, b) => b[1].total - a[1].total)
        let caption = `📊 *ᴅɪsᴛʀɪʙᴜsɪ ꜰɪᴛᴜʀ ʙᴏᴛ*\n\n`
        caption += `╭┈┈⬡「 📋 *ᴋᴀᴛᴇɢᴏʀɪ* 」\n`
        
        sorted.forEach(([cat, data]) => {
            const pct = ((data.total / totalCommands) * 100).toFixed(1)
            caption += `┃ ✧ \`${cat.toUpperCase()}\`: *${data.total}* _(${pct}%)_\n`
        })
        caption += `╰┈┈⬡\n\n`
        caption += `> ⚡ *${totalCommands}* fitur tersedia`
        
        await sock.sendMessage(m.chat, {
            image: chartBuffer,
            caption,
            contextInfo: {
                forwardingScore: 9999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: saluranId,
                    newsletterName: saluranName,
                    serverMessageId: 127
                }
            }
        }, { quoted: m })
        
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *ᴇʀʀᴏʀ*\n\n> ${error.message}`)
    }
}

module.exports = {
    config: pluginConfig,
    handler
}
