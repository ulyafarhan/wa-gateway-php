import Database from 'better-sqlite3';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let db;

export function createTestDb() {
  db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  const schema = execSync('node -e "console.log(require(require.resolve(\'better-sqlite3\')).prototype.constructor.toString())"', { cwd: path.join(__dirname, '../..') }).toString();
  return db;
}

export { db };
export function destroyTestDb() { db?.close(); }
