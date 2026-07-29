import fs from 'fs';
import { execSync } from 'child_process';
const src = process.env.DB_PATH || './data/wagateway.db';
const bak = `./data/backups/wagateway-${new Date().toISOString().slice(0,10)}.db`;
if (!fs.existsSync('./data/backups')) fs.mkdirSync('./data/backups', {recursive:true});
execSync(`cp "${src}" "${bak}"`);
const old = fs.readdirSync('./data/backups').filter(f => f.endsWith('.db'));
for (const f of old) {
    const p = `./data/backups/${f}`;
    if ((Date.now() - fs.statSync(p).mtimeMs) / 86400000 > 7) fs.unlinkSync(p);
}
console.log(`Backup: ${bak}`);
