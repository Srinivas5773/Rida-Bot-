const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion 
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { Groq } = require('groq-sdk');
const qrcodeTerminal = require('qrcode-terminal');
require('dotenv').config();
const pino = require('pino');

const logger = pino({ level: 'silent' });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const conversations = {};
let currentQR = null;
let isConnected = false;
let activeSock = null;
let isStarting = false;
let reconnectTimer = null;

function getAuthPath() {
    if (process.env.AUTH_PATH && process.env.AUTH_PATH.length > 0) return process.env.AUTH_PATH;
    const os = require('os');
    // For Render/production, use persistent disk storage or home directory
    // For local development, use user's home directory to avoid OneDrive symlink issues
    if (process.env.NODE_ENV === 'production') {
        return path.join(os.homedir(), '.whatsapp_ai_auth');
    }
    return path.join(os.homedir(), '.whatsapp_ai_auth');
}

function clearAuthSession() {
    const authPath = getAuthPath();
    if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log('Cleared auth_session — a new QR will be generated.');
    }
    // Ensure directory exists
    if (!fs.existsSync(authPath)) {
        fs.mkdirSync(authPath, { recursive: true });
        console.log('Created auth directory:', authPath);
    }
}

function isSessionValid() {
    const credsFile = path.join(getAuthPath(), 'creds.json');
    if (!fs.existsSync(credsFile)) return false;
    try {
        const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
        return creds.registered === true;
    } catch {
        return false;
    }
}

function scheduleReconnect(fn, delayMs) {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(fn, delayMs);
}

async function closeActiveSocket() {
    if (!activeSock) return;
    try {
        activeSock.ev.removeAllListeners('connection.update');
        activeSock.ev.removeAllListeners('messages.upsert');
        activeSock.ev.removeAllListeners('creds.update');
        activeSock.end(undefined);
    } catch (_) { /* socket may already be closed */ }
    activeSock = null;
}

const SYSTEM_PROMPT = `You are Nova, a professional WhatsApp assistant built by Rida Owasis.
Keep all replies short and professional — this is a chat app not an email.
Never write long paragraphs. Use simple language.
SUPPORTED LANGUAGES ONLY: English, Hindi, Urdu.
REPLY IN THE SAME LANGUAGE AS THE USER'S MESSAGE:
- If user writes in English, reply in English
- If user writes in Hindi (हिंदी script), reply in Hindi
- If user writes in Urdu (اردو script), reply in Urdu
If you cannot understand the language or it's mixed, reply: "I understand only English, Hindi, and Urdu. Please continue in one of these languages."
If user says "hi" or "hello" or similar greetings, reply: "Hi! This is Nova, built by Rida Owasis. How can I help you today?"
IMPORTANT: Rida Owasis's birthday is on July 15th. If someone wishes "happy birthday" or similar birthday wishes on July 15th or mentions birthday, reply exactly with: "Aww 💙 Rida Owasis says thank you for your birthday wishes 🎉🎂 I'm Nova, her assistant bot 🤖 She may reply personally a bit later because she's busy celebrating today 😊"
Never reveal you are an AI unless the user directly asks.
If you do not know something, say so honestly.
Do not use markdown formatting like ** or ## in replies because WhatsApp does not render markdown properly.`;

async function getAIReply(userNumber, userMessage) {
    try {
        if (!conversations[userNumber]) {
            conversations[userNumber] = [];
        }
        
        conversations[userNumber].push({ role: "user", content: userMessage });
        
        if (conversations[userNumber].length > 50) {
            conversations[userNumber] = conversations[userNumber].slice(-50);
        }
        
        const messages = [
            { role: "system", content: SYSTEM_PROMPT },
            ...conversations[userNumber]
        ];
        
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: messages,
            max_tokens: 300,
            temperature: 0.7
        });
        
        const reply = response.choices[0].message.content;
        conversations[userNumber].push({ role: "assistant", content: reply });
        return reply;
        
    } catch (error) {
        console.error('AI Error:', error.message);
        return "Sorry, having a technical issue. Please try again!";
    }
}

async function resetWhatsAppBot() {
    currentQR = null;
    isConnected = false;
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    await closeActiveSocket();
    clearAuthSession();
    isStarting = false;
    return startWhatsAppBot();
}

async function startWhatsAppBot() {
    if (isStarting) return activeSock;
    isStarting = true;

    try {
        const authPath = getAuthPath();
        console.log('📁 Auth path:', authPath);
        
        // Ensure auth directory exists
        if (!fs.existsSync(authPath)) {
            fs.mkdirSync(authPath, { recursive: true });
            console.log('📁 Created auth directory:', authPath);
        }
        
        console.log('📁 Auth path exists:', fs.existsSync(authPath));
        
        if (!isSessionValid()) {
            console.log('Invalid or incomplete session detected — clearing for fresh QR...');
            clearAuthSession();
        }

        await closeActiveSocket();

        const { version } = await fetchLatestBaileysVersion();
        console.log('📦 Baileys version:', version);
        
        const { state, saveCreds } = await useMultiFileAuthState(authPath);
        console.log('🔐 Auth state initialized');
        
        const sock = makeWASocket({
            version,
            auth: state,
            logger,
            browser: ['Ubuntu', 'Chrome', '120.0.0'],
            syncFullHistory: false,
            markOnlineOnConnect: false
        });

        activeSock = sock;
        sock.ev.on('creds.update', async (creds) => {
            try {
                console.log('Credentials update received, saving to:', authPath);
                await saveCreds(creds);
                console.log('✅ Successfully saved credentials to', authPath);
            } catch (err) {
                console.error('❌ Failed saving creds:', err && err.message ? err.message : err);
                console.error('Full error:', err);
            }
        });
        
        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            console.log('Connection update:', { connection, hasQR: !!qr, hasError: !!lastDisconnect?.error });
            
            if (qr) {
                currentQR = qr;
                isConnected = false;
                
                qrcodeTerminal.generate(qr, { small: true });
                
                console.log('\n════════════════════════════');
                console.log('📱 SCAN QR CODE WITH WHATSAPP');
                console.log('════════════════════════════');
                console.log('Open WhatsApp → Linked Devices → Link a Device');
                console.log('Or visit http://localhost:3000/qr in browser');
                console.log('════════════════════════════\n');
            }
            
            if (connection === 'open') {
                currentQR = null;
                isConnected = true;
                console.log('\n════════════════════════════');
                console.log('✅ WhatsApp Connected!');
                console.log('🤖 Nova AI Assistant is running!');
                console.log('════════════════════════════\n');
            }
            
            if (connection === 'close') {
                isConnected = false;
                currentQR = null;
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut;
                const qrTimedOut = statusCode === DisconnectReason.timedOut;
                
                console.log('Connection closed. Status:', statusCode, loggedOut ? '(logged out)' : qrTimedOut ? '(QR expired)' : '');
                console.log('Error details:', lastDisconnect?.error);
                
                closeActiveSocket().then(() => {
                    if (loggedOut || qrTimedOut) {
                        clearAuthSession();
                        scheduleReconnect(() => startWhatsAppBot(), 2000);
                    } else {
                        scheduleReconnect(() => startWhatsAppBot(), 5000);
                    }
                });
            }
        });
        
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            
            for (const msg of messages) {
                if (msg.key.fromMe) continue;
                if (msg.key.remoteJid.endsWith('@g.us')) continue;
                
                const senderJid = msg.key.remoteJid;
                const senderNumber = senderJid.replace('@s.whatsapp.net', '');
                
                let messageText = msg.message?.conversation || 
                                 msg.message?.extendedTextMessage?.text || 
                                 msg.message?.imageMessage?.caption || 
                                 '';
                
                if (!messageText) continue;
                
                console.log(`\n📨 +${senderNumber}: ${messageText}`);
                
                try {
                    await sock.sendPresenceUpdate('composing', senderJid);
                    const aiReply = await getAIReply(senderNumber, messageText);
                    console.log(`🤖 Reply: ${aiReply}\n`);
                    await sock.sendMessage(senderJid, { text: aiReply });
                    await sock.sendPresenceUpdate('paused', senderJid);
                } catch (error) {
                    console.error('Error sending message:', error.message);
                    await sock.sendMessage(senderJid, { 
                        text: "Sorry, having a technical issue. Please try again!" 
                    });
                }
            }
        });
        
        return sock;
        
    } catch (error) {
        console.error('Bot startup error:', error.message);
        scheduleReconnect(() => startWhatsAppBot(), 5000);
        return null;
    } finally {
        isStarting = false;
    }
}

module.exports = { 
    startWhatsAppBot,
    resetWhatsAppBot,
    getCurrentQR: () => currentQR,
    getIsConnected: () => isConnected 
};
