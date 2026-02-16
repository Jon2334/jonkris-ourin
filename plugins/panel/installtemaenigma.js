const { Client } = require('ssh2')

const pluginConfig = {
    name: 'installtemaenigma',
    alias: ['installthemaenigma', 'temaenigma'],
    category: 'panel',
    description: 'Install tema Enigma untuk panel Pterodactyl via SSH',
    usage: '.installtemaenigma <ip>|<password>|<link_wa>|<link_group>|<link_channel>',
    example: '.installtemaenigma 192.168.1.1|secretpass|https://wa.me/628xxx|https://t.me/group|https://t.me/channel',
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
            `╭┈┈⬡「 🎨 *ɪɴsᴛᴀʟʟ ᴛᴇᴍᴀ ᴇɴɪɢᴍᴀ* 」
┃ ㊗ ᴜsᴀɢᴇ: \`${m.prefix}installtemaenigma <ip>|<password>|<link_wa>|<link_group>|<link_channel>\`
╰┈┈⬡

> Contoh:
> \`${m.prefix}installtemaenigma 192.168.1.1|pass|https://wa.me/628xxx|https://t.me/group|https://t.me/channel\``
        )
    }
    
    const parts = text.split('|')
    if (parts.length < 5) {
        return m.reply(`❌ Format salah!\n\n> Gunakan: \`ip|password|link_wa|link_group|link_channel\``)
    }
    
    const ipvps = parts[0].trim()
    const passwd = parts[1].trim()
    const linkWa = parts[2].trim()
    const linkGroup = parts[3].trim()
    const linkChannel = parts[4].trim()
    
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
        m.reply(`⏳ *ᴍᴇᴍᴘʀᴏsᴇs ɪɴsᴛᴀʟʟ ᴛᴇᴍᴀ ᴇɴɪɢᴍᴀ...*\n\n> Tunggu 1-10 menit hingga proses selesai`)
        
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
                    `╭┈┈⬡「 ✅ *ᴛᴇᴍᴀ ᴇɴɪɢᴍᴀ* 」
┃ ㊗ sᴛᴀᴛᴜs: *Terinstall*
┃ ㊗ ɪᴘ: ${ipvps}
╰┈┈⬡

> _Tema Enigma berhasil diinstall!_`
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
                    stream.write('3\n')
                    inputState = 3
                    buffer = ''
                } else if (inputState === 3 && buffer.includes('WhatsApp')) {
                    stream.write(linkWa + '\n')
                    inputState = 4
                    buffer = ''
                } else if (inputState === 4 && buffer.includes('group')) {
                    stream.write(linkGroup + '\n')
                    inputState = 5
                    buffer = ''
                } else if (inputState === 5 && buffer.includes('channel')) {
                    stream.write(linkChannel + '\n')
                    inputState = 6
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
