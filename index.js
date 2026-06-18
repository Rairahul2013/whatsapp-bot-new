const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');

const pino = require('pino');

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_multi');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, // Pairing code use kar rahe hain isliye false sahi hai
        auth: state,
        browser: ["Ubuntu", "Chrome", "20.0.04"] // WhatsApp server ko device register karne ke liye zaroori hai
    });

    // Jab connection update ho tab pairing code request karenge
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

            if (shouldReconnect) {
                console.log("Reconnecting bot...");
                startBot();
            }
        }

        else if (connection === 'open') {
            console.log('WhatsApp Bot successfully connected! 🎉');
        }

        // Agar user registered nahi hai, toh connection start hote hi pairing code mangenge
        if (!sock.authState.creds.registered && connection === 'connecting') {
            const phoneNumber = "919161277551";

            setTimeout(async () => {
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log("CODE_START:" + code + ":CODE_END");
                } catch (err) {
                    console.log("Pairing code error: ", err.message);
                }
            }, 6000); // Thoda zyada delay (6 seconds) diya hai taaki socket fully ready ho jaye
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        if (!msg.message || msg.key.fromMe) return;

        const remoteJid = msg.key.remoteJid;

        const textMessage =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";

        const command = textMessage.toLowerCase().trim();

        if (command === '.ping') {
            await sock.sendMessage(remoteJid, {
                text: 'Pong! Bot active hai. 🚀'
            });
        }

        else if (command === '.menu' || command === '.help') {
            await sock.sendMessage(remoteJid, {
                text: '✨ *Elaina Bot Menu* ✨\n\n💬 *.ping* - Check bot status\nℹ️ *.info* - About bot'
            });
        }

        else if (command === '.info') {
            await sock.sendMessage(remoteJid, {
                text: 'Main ek 24/7 online rehne wala WhatsApp Bot hoon!'
            });
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

startBot();
