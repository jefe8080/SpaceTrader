// Löscht den Spielstand (Weltreset). Server vorher beenden.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {runtimeOptions} from '../server/world-profile.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {dbFile}=runtimeOptions(root);
if(dbFile===':memory:')throw new Error('Kein gespeicherter Spielstand ausgewählt.');
const selected=path.resolve(dbFile);
for(const suffix of ['','-wal','-shm'])if(fs.existsSync(selected+suffix)){
  fs.unlinkSync(selected+suffix);console.log('gelöscht:',selected+suffix);
}
