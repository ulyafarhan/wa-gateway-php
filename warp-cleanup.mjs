import db from './src/db.js';
db.prepare('DELETE FROM sessions').run();
db.prepare('DELETE FROM auth_state').run();
console.log('DB cleaned');
