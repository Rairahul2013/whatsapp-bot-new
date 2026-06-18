const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running 24/7! 🚀');
});

app.listen(port, () => {
    console.log("Server listening on port " + port);
});

async function startBot() {
    // Session folder ka naam change kar diya
    const { state, saveCreds } = await useMultiFileAuthState('my_new_session');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Chrome (Linux)", "Chrome", "120.0.0.0"]
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('WhatsApp Bot successfully connected! 🎉');
        }
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = "9161277551"; 
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("CODE_START:" + code + ":CODE_END");
            } catch (err) {
                console.log("Pairing code error: ", err.message);
            }
        }, 25000); // 25 seconds ka delay
    }

    sock.ev.on('creds.update', saveCreds);
}

startBot();
               
