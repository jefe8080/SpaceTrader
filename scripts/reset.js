// Löscht den Spielstand (Weltreset). Server vorher beenden.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (/^spacetrader\.db(-wal|-shm)?$/.test(f)) {
    fs.rmSync(path.join(dir, f));
    console.log('gelöscht:', f);
  }
}
