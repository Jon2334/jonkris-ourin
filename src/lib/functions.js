/**
 * Credits & Thanks to
 * Developer = Lucky Archz ( Zann )
 * Lead owner = HyuuSATAN
 * Owner = Keisya
 * Owner = Syura Salsabila
 * Designer = Danzzz
 * Wileys = Penyedia baileys
 * Penyedia API
 * Penyedia Scraper
 * * JANGAN HAPUS/GANTI CREDITS & THANKS TO
 * Saluran Resmi Ourin:
 * https://whatsapp.com/channel/0029VbB37bgBfxoAmAlsgE0t 
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

// --- FUNGSI TAMBAHAN (FIX ERROR) ---

/**
 * Menghitung durasi uptime dalam format human-readable
 * (Fix untuk error: getUptime is not a function)
 * @param {number} seconds - Waktu dalam detik
 */
function getUptime(seconds) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

/**
 * Alias untuk delay (karena beberapa handler pakai nama sleep)
 */
const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// --- FUNGSI BAWAAN ---

/**
 * Generate random string dengan panjang tertentu
 */
function randomString(length, charset = 'alphanumeric') {
    const charsets = {
        alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        numeric: '0123456789',
        alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
        hex: '0123456789abcdef'
    };
    
    const chars = charsets[charset] || charsets.alphanumeric;
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(array) {
    if (!Array.isArray(array) || array.length === 0) return null;
    return array[Math.floor(Math.random() * array.length)];
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isUrl(str) {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

function isPhoneNumber(str) {
    return /^[0-9]{10,15}$/.test(str.replace(/[^0-9]/g, ''));
}

function isEmail(str) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function parseMention(text) {
    if (!text) return [];
    const matches = text.match(/@([0-9]+)/g);
    if (!matches) return [];
    return matches.map(m => m.replace('@', ''));
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
        if (source[key] instanceof Object && key in target) {
            result[key] = deepMerge(target[key], source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

async function fetchBuffer(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Failed to fetch buffer: ${error.message}`);
    }
}

// Alias getBuffer ke fetchBuffer (kompatibilitas)
const getBuffer = fetchBuffer;

async function fetchJson(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'json',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
            },
            ...options
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch JSON: ${error.message}`);
    }
}

async function fetchText(url, options = {}) {
    try {
        const response = await axios.get(url, {
            responseType: 'text',
            ...options
        });
        return response.data;
    } catch (error) {
        throw new Error(`Failed to fetch text: ${error.message}`);
    }
}

async function downloadFile(url, filePath) {
    try {
        const buffer = await fetchBuffer(url);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch (error) {
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function sha256(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function toBase64(str) {
    return Buffer.from(str).toString('base64');
}

function fromBase64(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
}

function isFile(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch {
        return false;
    }
}

function isDirectory(dirPath) {
    try {
        return fs.statSync(dirPath).isDirectory();
    } catch {
        return false;
    }
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
    return true;
}

function readJsonFile(filePath, defaultValue = {}) {
    try {
        if (!fs.existsSync(filePath)) return defaultValue;
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return defaultValue;
    }
}

function writeJsonFile(filePath, data, pretty = true) {
    try {
        const dir = path.dirname(filePath);
        ensureDir(dir);
        
        const content = pretty 
            ? JSON.stringify(data, null, 2) 
            : JSON.stringify(data);
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    } catch {
        return false;
    }
}

function getMimeType(buffer) {
    const signatures = {
        'ffd8ff': 'image/jpeg',
        '89504e47': 'image/png',
        '47494638': 'image/gif',
        '52494646': 'image/webp',
        '00000020': 'video/mp4',
        '00000018': 'video/mp4',
        '00000014': 'video/mp4',
        '1a45dfa3': 'video/webm',
        '4f676753': 'audio/ogg',
        'fff3': 'audio/mpeg',
        'fff2': 'audio/mpeg',
        'fffb': 'audio/mpeg',
        '494433': 'audio/mpeg',
        '25504446': 'application/pdf'
    };
    
    const hex = buffer.slice(0, 4).toString('hex');
    
    for (const [sig, mime] of Object.entries(signatures)) {
        if (hex.startsWith(sig)) {
            return mime;
        }
    }
    
    return 'application/octet-stream';
}

function getExtension(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'audio/mpeg': 'mp3',
        'audio/ogg': 'ogg',
        'audio/opus': 'opus',
        'application/pdf': 'pdf'
    };
    
    return extensions[mimeType] || 'bin';
}

async function randomDelay(minMs, maxMs) {
    const ms = randomInt(minMs, maxMs);
    return delay(ms);
}

async function retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await delay(baseDelay * Math.pow(2, i));
            }
        }
    }
    
    throw lastError;
}

function chunk(array, size) {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

function flatten(array, depth = 1) {
    return array.flat(depth);
}

function unique(array) {
    return [...new Set(array)];
}

function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

function sortBy(array, key, order = 'asc') {
    const multiplier = order === 'desc' ? -1 : 1;
    return [...array].sort((a, b) => {
        if (a[key] < b[key]) return -1 * multiplier;
        if (a[key] > b[key]) return 1 * multiplier;
        return 0;
    });
}

// Pastikan getUptime ikut diekspor
module.exports = {
    getUptime,
    sleep,
    getBuffer,
    randomString,
    randomInt,
    randomPick,
    delay,
    isUrl,
    isPhoneNumber,
    isEmail,
    parseMention,
    escapeRegex,
    deepClone,
    deepMerge,
    fetchBuffer,
    fetchJson,
    fetchText,
    downloadFile,
    md5,
    sha256,
    toBase64,
    fromBase64,
    isFile,
    isDirectory,
    ensureDir,
    readJsonFile,
    writeJsonFile,
    getMimeType,
    getExtension,
    randomDelay,
    retry,
    chunk,
    flatten,
    unique,
    groupBy,
    sortBy
};