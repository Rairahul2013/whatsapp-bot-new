const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    delay
} = require('@whiskeysockets/baileys');

const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_multi');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"]
    });

    // Jab connection open ya close hoga
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("Connection closed, reconnecting in 5 seconds...");
                setTimeout(() => startBot(), 5000); // 5 second baad auto reconnect
            }
        }

        else if (connection === 'open') {
            console.log('WhatsApp Bot successfully connected! 🎉');
        }
    });

    // Pairing code request karne ka sabse stable tareeka
    if (!sock.authState.creds.registered) {
        const phoneNumber = "919161277551";
        
        // Socket ko fully boot hone ke liye 10 second ka wait denge
        setTimeout(async () => {
            try {
                console.log(Requesting pairing code for: ${phoneNumber});
                let code = await sock.requestPairingCode(phoneNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log("CODE_START:" + code + ":CODE_END");
            } catch (err) {
                console.log("Pairing code error: ", err.message);
                console.log("Retrying pairing code request in 10 seconds...");
                // Agar fail hua toh ek baar aur try karega
                setTimeout(async () => {
                    try {
                        let code = await sock.requestPairingCode(phoneNumber);
                        code = code?.match(/.{1,4}/g)?.join("-") || code;
                        console.log("CODE_START:" + code + ":CODE_END");
                    } catch (retryErr) {
                        console.log("Retry also failed: ", retryErr.message);
                    }
                }, 10000);
            }
        }, 10000); 
    }

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;
        const textMessage = msg.message?.conversation  msg.message?.extendedTextMessage?.text  "";
        const command = textMessage.toLowerCase().trim();

        if (command === '.ping') {
            await sock.sendMessage(remoteJid, { text: 'Pong! Bot active hai. 🚀' });
        }
        else if (command === '.menu' || command === '.help') {
            await sock.sendMessage(remoteJid, { text: '✨ *Elaina Bot Menu* ✨\n\n💬 *.ping* - Check bot status\nℹ️ *.info* - About bot' });
        }
        else if (command === '.info') {
            await sock.sendMessage(remoteJid, { text: 'Main ek 24/7 online rehne wala WhatsApp Bot hoon!' });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
