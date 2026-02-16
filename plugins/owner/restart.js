const pluginConfig = {
    name: 'restart',
    alias: ['reset', 'reboot'],
    category: 'owner',
    description: 'Restart bot process',
    usage: '.restart',
    example: '.restart',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    limit: 0,
    isEnabled: true
}

async function handler(m, { sock }) {
    await m.reply('🔄 *Restarting Bot...*\n\n> Bot akan aktif kembali dalam beberapa detik.')
    console.log('Restarting via command...')
    
    // Allow message to send before exit
    setTimeout(() => {
        process.exit(0) // Process manager (PM2/Nodemon) will restart it
    }, 1000)
}

module.exports = {
    config: pluginConfig,
    handler
}
