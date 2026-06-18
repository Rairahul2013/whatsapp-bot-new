import 'dotenv/config';
import fs, { existsSync, mkdirSync, rmSync } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { smsg } from './lib/myfunc.js';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys';
import NodeCache from 'node-cache';
import pino from 'pino';
import config from './config.js';
import store from './lib/lightweight_store.js';
import SaveCreds from './lib/session.js';
import { server, PORT } from './lib/server.js';
import { printLog } from './lib/print.js';
import { handleMessages } from './lib/messageHandler.js';
import commandHandler from './lib/commandHandler.js';

store.readFromFile();
setInterval(() => store.writeToFile(), config.storeWriteInterval || 10000);

const phoneNumber = config.pairingNumber || "919161277551";

// Server start
server.listen(PORT, () => {
    printLog('success', `Server listening on port ${PORT}`);
});

async function startQasimDev() {
    try {
        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        
        const QasimDev = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Chrome'),
            auth: {
                creds: state.creds,
                keys: state.keys,
            },
            getMessage: async (key) => {
                const jid = jidNormalizedUser(key.remoteJid);
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || "";
            },
        });

        QasimDev.ev.on('creds.update', saveCreds);
        store.bind(QasimDev.ev);

        QasimDev.ev.on('messages.upsert', async (chatUpdate) => {
            try {
                await handleMessages(QasimDev, chatUpdate);
            } catch (err) {
                printLog('error', `Error in messages.upsert: ${err.message}`);
            }
        });

        // Pairing code logic
        const isRegistered = state.creds?.registered === true;
        if (!isRegistered) {
            setTimeout(async () => {
                let code = await QasimDev.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
                console.log("PAIRING CODE : " + code);
            }, 3000);
        }

        QasimDev.ev.on('connection.update', async (s) => {
            const { connection } = s;
            if (connection === "open") {
                printLog('success', 'Bot Connected Successfully!');
            }
        });

    } catch (e) {
        printLog('error', `Start Error: ${e.message}`);
    }
}

startQasimDev();
    
