const mongoose = require('mongoose');
const { 
    initAuthCreds, 
    BufferJSON, 
    proto 
} = require("@whiskeysockets/baileys");

/**
 * Skema Database untuk Sesi WhatsApp
 * Menggunakan Compound Index agar sessionId + key bersifat unik,
 * bukan hanya sessionId-nya saja.
 */
const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true },
    key: { type: String, required: true },
    data: { type: Object, required: true }
});

// Membuat index unik kombinasi (sessionId + key) untuk mencegah duplikasi data yang sama
sessionSchema.index({ sessionId: 1, key: 1 }, { unique: true });

// KITA GANTI NAMA MODEL KE 'WaSession' AGAR MEMBUAT KOLEKSI BARU
// Ini solusi ampuh untuk error "E11000 duplicate key" tanpa perlu hapus DB manual
const Session = mongoose.models.WaSession || mongoose.model('WaSession', sessionSchema);

/**
 * Fungsi Auth State Custom untuk MongoDB
 * @param {string} sessionId - ID Sesi
 */
const useMongoDBAuthState = async (sessionId) => {
    // Pastikan koneksi DB hidup
    if (mongoose.connection.readyState !== 1) {
        if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI belum diset di .env atau Heroku Config Vars!");
        await mongoose.connect(process.env.MONGODB_URI);
    }

    const writeData = async (data, key) => {
        try {
            await Session.updateOne(
                { sessionId, key },
                { data: JSON.parse(JSON.stringify(data, BufferJSON.replacer)) },
                { upsert: true }
            );
        } catch (error) {
            console.error('MongoDB Write Error:', error.message);
        }
    };

    const readData = async (key) => {
        try {
            const result = await Session.findOne({ sessionId, key });
            if (result && result.data) {
                return JSON.parse(JSON.stringify(result.data), BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error('MongoDB Read Error:', error.message);
            return null;
        }
    };

    const removeData = async (key) => {
        try {
            await Session.deleteOne({ sessionId, key });
        } catch (error) {
            console.error('MongoDB Remove Error:', error.message);
        }
    };

    // Load credentials pertama kali
    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
};

module.exports = { useMongoDBAuthState };