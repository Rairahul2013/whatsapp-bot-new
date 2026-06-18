const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running 24/7! 🚀');
});

// Is line ko ekdam simple bina kisi backtick ke fix kar diya hai:
app.listen(port, () => {
    console.log("Server listening on port " + port);
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_multi');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log("Connection closed, reconnecting...");
                startBot();
            }
        } else if (connection === 'open') {
            console.log('WhatsApp Bot successfully connected! 🎉');
        }
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "919161277551";
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("CODE_START:" + code + ":CODE_END");
            } catch (err) {
                console.log("Pairing code error: ", err.message);
            }
        }, 10000); 
    }

    sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages) return;
        const msg = m.messages[0];
        if (!msg  !msg.message  msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const textMessage = msg.message?.conversation  msg.message?.extendedTextMessage?.text  "";
        const command = textMessage.toLowerCase().trim();

        if (command === '.ping') {
            await sock.sendMessage(remoteJid, { text: 'Pong! Bot active hai. 🚀' });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
