const { getFullSchedulerStatus, formatTimeRemaining, getMsUntilTime } = require('../../src/lib/scheduler');
const { initSholatScheduler, stopSholatScheduler, JADWAL_SHOLAT } = require('../../src/lib/sholatScheduler');
const { getDatabase } = require('../../src/lib/database');

const pluginConfig = {
    name: 'cekschedule',
    alias: ['cekscheduler', 'schedulerstatus', 'schedstatus'],
    category: 'owner',
    description: 'Melihat status semua scheduler bot',
    usage: '.cekschedule',
    example: '.cekschedule',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 3,
    limit: 0,
    isEnabled: true
};

async function handler(m, { sock }) {
    try {
        const status = getFullSchedulerStatus();
        const db = getDatabase();
        const sholatEnabled = db.setting('autoSholat') || false;
        
        let text = `📊 *sᴄʜᴇᴅᴜʟᴇʀ sᴛᴀᴛᴜs*\n\n`;
        
        for (const sched of status.schedulers) {
            const statusIcon = sched.running ? '✅' : '❌';
            text += `${statusIcon} *${sched.name}*\n`;
            text += `   └ Key: \`${sched.key}\`\n`;
            text += `   └ ${sched.description}\n`;
            
            if (sched.lastRun && sched.lastRun !== '-' && sched.lastRun !== 'Never') {
                text += `   └ Last: ${sched.lastRun}\n`;
            }
            
            if (sched.stats) {
                if (sched.stats.totalResets) {
                    text += `   └ Total Resets: ${sched.stats.totalResets}\n`;
                }
                if (sched.stats.activeMessages !== undefined) {
                    text += `   └ Active: ${sched.stats.activeMessages} | Sent: ${sched.stats.totalSent}\n`;
                }
            }
            text += `\n`;
        }
        
        const sholatIcon = sholatEnabled ? '✅' : '❌';
        text += `${sholatIcon} *Sholat Scheduler*\n`;
        text += `   └ Key: \`sholat\`\n`;
        text += `   └ Notifikasi waktu sholat\n`;
        
        if (sholatEnabled) {
            const now = new Date();
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            let nextSholat = null;
            let nextTime = null;
            
            for (const [name, time] of Object.entries(JADWAL_SHOLAT)) {
                if (time > currentTime) {
                    nextSholat = name;
                    nextTime = time;
                    break;
                }
            }
            
            if (!nextSholat) {
                nextSholat = 'Imsak';
                nextTime = JADWAL_SHOLAT.Imsak;
            }
            
            text += `   └ Next: ${nextSholat} (${nextTime} WIB)\n`;
        }
        
        text += `\n`;
        text += `━━━━━━━━━━━━━━━━━━━\n`;
        text += `✅ Aktif: ${status.summary.totalActive + (sholatEnabled ? 1 : 0)}\n`;
        text += `❌ Nonaktif: ${status.summary.totalInactive + (!sholatEnabled ? 1 : 0)}\n\n`;
        
        text += `> Gunakan \`.stopschedule <key>\` untuk stop\n`;
        text += `> Gunakan \`.startschedule <key>\` untuk start`;
        
        await m.reply(text);
    } catch (error) {
        console.error('[CekSchedule Error]', error);
        await m.reply(`❌ Error: ${error.message}`);
    }
}

module.exports = {
    config: pluginConfig,
    handler
};
