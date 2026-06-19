sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg.message || msg.key.fromMe) return;
    const jid = msg.key.remoteJid;
    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();
    
    // Yahan naye commands add karein
    if (text === '.ping') {
        await sock.sendMessage(jid, { text: 'Pong! 🚀' });
    } else if (text === '.menu') {
        await sock.sendMessage(jid, { text: 'Ye raha menu: \n1. .ping\n2. .menu' });
    } else if (text === '.status') {
        await sock.sendMessage(jid, { text: 'Bot bilkul mast chal raha hai! ✅' });
    }
});
