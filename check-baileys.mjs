import("@whiskeysockets/baileys").then(m => {
    const keys = Object.keys(m).filter(k => k.includes('init') || k.includes('Auth') || k.includes('creds') || k.includes('Creds') || k.includes('auth') || k.includes('generate') || k.includes('Key'));
    console.log('Exports:', keys.join(', '));
}).catch(e => console.log('Error:', e.message));
