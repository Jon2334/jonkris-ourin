const { Client } = require('ssh2')

const pluginConfig = {
    name: 'installtemabilling',
    alias: ['installthemabilling', 'temabilling'],
    category: 'panel',
    description: 'Install tema Billing untuk panel Pterodactyl via SSH',
    usage: '.installtemabilling <ip>|<password>',
    example: '.installtemabilling 192.168.1.1|secretpass',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    limit: 0,
    isEnabled: true
}

async function handler(m) {
    const text = m.text?.trim()
    
    if (!text) {
        return m.reply(
            `╭┈┈⬡「 🎨 *ɪɴsᴛᴀʟʟ ᴛᴇᴍᴀ ʙɪʟʟɪɴɢ* 」
┃ ㊗ ᴜsᴀɢᴇ: \`${m.prefix}installtemabilling <ip>|<password>\`
╰┈┈⬡

> \`Contoh: ${m.prefix}installtemabilling 192.168.1.1|secretpass\``
        )
    }
    
    const parts = text.split('|')
    if (parts.length < 2) {
        return m.reply(`❌ Format salah! Gunakan: \`ip|password\``)
    }
    
    const ipvps = parts[0].trim()
    const passwd = parts[1].trim()
    
    const connSettings = {
        host: ipvps,
        port: 22,
        username: 'root',
        password: passwd
    }
    
    const command = `bash <(curl -s https://raw.githubusercontent.com/veryLinh/Theme-Autoinstaller/main/install.sh)`
    const ress = new Client()
    
    m.react('⏳')
    
    ress.on('ready', () => {
        m.reply(`⏳ *ᴍᴇᴍᴘʀᴏsᴇs ɪɴsᴛᴀʟʟ ᴛᴇᴍᴀ ʙɪʟʟɪɴɢ...*\n\n> Tunggu 1-10 menit hingga proses selesai`)
        
        ress.exec(command, { pty: true }, (err, stream) => {
            if (err) {
                m.react('❌')
                return m.reply(`❌ Error: ${err.message}`)
            }
            
            let inputState = 0
            let buffer = ''
            
            stream.on('close', async () => {
                m.react('✅')
                await m.reply(
                    `╭┈┈⬡「 ✅ *ᴛᴇᴍᴀ ʙɪʟʟɪɴɢ* 」
┃ ㊗ sᴛᴀᴛᴜs: *Terinstall*
┃ ㊗ ɪᴘ: ${ipvps}
╰┈┈⬡

> _Tema Billing berhasil diinstall!_`
                )
                ress.end()
            }).on('data', (data) => {
                const output = data.toString()
                buffer += output
                console.log('[InstallTema]', output)
                
                if (inputState === 0 && buffer.includes('AKSES TOKEN')) {
                    stream.write('skyzodev\n')
                    inputState = 1
                    buffer = ''
                } else if (inputState === 1 && buffer.includes('Masukkan pilihan')) {
                    stream.write('1\n')
                    inputState = 2
                    buffer = ''
                } else if (inputState === 2 && buffer.includes('Masukkan pilihan')) {
                    stream.write('2\n')
                    inputState = 3
                    buffer = ''
                }
            }).stderr.on('data', (data) => {
                console.log('[InstallTema STDERR]', data.toString())
            })
        })
    }).on('error', (err) => {
        console.log('[SSH Error]', err)
        m.react('❌')
        m.reply(`❌ Koneksi gagal!\n\n> IP atau Password tidak valid.`)
    }).connect(connSettings)
}

module.exports = {
    config: pluginConfig,
    handler
}
