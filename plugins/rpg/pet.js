const { getDatabase } = require('../../src/lib/database')
const { getRpgContextInfo } = require('../../src/lib/contextHelper')

const pluginConfig = {
    name: 'pet',
    alias: ['hewan', 'peliharaan'],
    category: 'rpg',
    description: 'Sistem pet (beli, beri makan, lihat)',
    usage: '.pet <buy/feed/view>',
    example: '.pet buy kucing',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    limit: 0,
    isEnabled: true
}

const PETS = {
    kucing: { name: '🐱 Kucing', price: 10000, bonus: { luck: 5 } },
    anjing: { name: '🐕 Anjing', price: 15000, bonus: { attack: 5 } },
    burung: { name: '🦜 Burung', price: 8000, bonus: { exp: 10 } },
    kelinci: { name: '🐰 Kelinci', price: 5000, bonus: { speed: 5 } },
    naga: { name: '🐉 Naga', price: 500000, bonus: { attack: 50, defense: 30 } }
}

async function handler(m, { sock }) {
    const db = getDatabase()
    const user = db.getUser(m.sender)
    
    if (!user.rpg) user.rpg = {}
    if (!user.rpg.pets) user.rpg.pets = []
    
    const args = m.args || []
    const action = args[0]?.toLowerCase()
    
    if (action === 'buy') {
        const petKey = args[1]?.toLowerCase()
        const pet = PETS[petKey]
        
        if (!pet) {
            let txt = `🐾 *ᴘᴇᴛ sʜᴏᴘ*\n\n`
            for (const [key, p] of Object.entries(PETS)) {
                txt += `╭┈┈⬡「 ${p.name} 」\n`
                txt += `┃ 💰 Harga: Rp ${p.price.toLocaleString('id-ID')}\n`
                txt += `┃ 📈 Bonus: ${Object.entries(p.bonus).map(([k, v]) => `${k} +${v}`).join(', ')}\n`
                txt += `┃ 🔧 ID: \`${key}\`\n`
                txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
            }
            txt += `> Beli: \`.pet buy <id>\``
            return m.reply(txt)
        }
        
        if ((user.balance || 0) < pet.price) {
            return m.reply(
                `❌ *sᴀʟᴅᴏ ᴛɪᴅᴀᴋ ᴄᴜᴋᴜᴘ*\n\n` +
                `> Balance kamu: Rp ${(user.balance || 0).toLocaleString('id-ID')}\n` +
                `> Butuh: Rp ${pet.price.toLocaleString('id-ID')}`
            )
        }
        
        if (user.rpg.pets.find(p => p.type === petKey)) {
            return m.reply(`❌ *sᴜᴅᴀʜ ᴘᴜɴʏᴀ*\n\n> Kamu sudah punya ${pet.name}!`)
        }
        
        user.balance -= pet.price
        user.rpg.pets.push({
            type: petKey,
            name: pet.name,
            hunger: 100,
            happiness: 100,
            level: 1,
            boughtAt: Date.now()
        })
        
        for (const [stat, value] of Object.entries(pet.bonus)) {
            user.rpg[stat] = (user.rpg[stat] || 0) + value
        }
        
        db.save()
        return m.reply(`✅ *ʙᴇʀʜᴀsɪʟ ᴍᴇᴍʙᴇʟɪ*\n\n> 🐾 Pet: ${pet.name}\n> 📈 Bonus stats applied!`)
    }
    
    if (action === 'feed') {
        if (user.rpg.pets.length === 0) {
            return m.reply(`❌ *ʙᴇʟᴜᴍ ᴘᴜɴʏᴀ ᴘᴇᴛ*\n\n> Beli dulu dengan \`.pet buy\``)
        }
        
        const feedCost = 1000
        if ((user.balance || 0) < feedCost) {
            return m.reply(
                `❌ *sᴀʟᴅᴏ ᴛɪᴅᴀᴋ ᴄᴜᴋᴜᴘ*\n\n` +
                `> Butuh: Rp ${feedCost.toLocaleString('id-ID')} untuk feed semua pet`
            )
        }
        
        user.balance -= feedCost
        for (const pet of user.rpg.pets) {
            pet.hunger = 100
            pet.happiness = Math.min(100, (pet.happiness || 50) + 20)
        }
        
        db.save()
        return m.reply(`🍖 *ꜰᴇᴇᴅ sᴜᴋsᴇs*\n\n> Semua pet sudah diberi makan!\n> Hunger restored, Happiness +20`)
    }
    
    let txt = `🐾 *ᴍʏ ᴘᴇᴛs*\n\n`
    
    if (user.rpg.pets.length === 0) {
        txt += `> Belum punya pet!\n> Beli dengan \`.pet buy\``
    } else {
        for (const pet of user.rpg.pets) {
            txt += `╭┈┈⬡「 ${pet.name} 」\n`
            txt += `┃ 🍖 Hunger: ${pet.hunger}%\n`
            txt += `┃ 😊 Happiness: ${pet.happiness}%\n`
            txt += `┃ 📊 Level: ${pet.level}\n`
            txt += `╰┈┈┈┈┈┈┈┈⬡\n\n`
        }
        txt += `> Feed: \`.pet feed\``
    }
    
    await m.reply(txt)
}

module.exports = {
    config: pluginConfig,
    handler
}
