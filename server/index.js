import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { NET } from '../shared/config.js';
import { Game } from './game.js';
import { Net } from './net.js';
import { runtimeOptions } from './world-profile.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const { dbFile: DB_FILE, profile } = runtimeOptions(root);

const app = express();
app.use(express.static(path.join(root, 'client')));
app.use('/vendor/three/addons', express.static(path.join(root, 'node_modules/three/examples/jsm')));
app.use('/vendor/three', express.static(path.join(root, 'node_modules/three/build')));
app.use('/shared', express.static(path.join(root, 'shared')));
if (profile === 'homeworld'&&process.env.DEV_TOOLS==='1') app.use('/dev', express.static(path.join(root, 'tests', 'browser')));

const server = http.createServer(app);
const io = new Server(server);
const game = new Game(DB_FILE, { verbose: true, profile });
const net = new Net(io, game);

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  game.tick(Math.min(0.5, (now - last) / 1000));
  last = now;
}, NET.TICK_MS);
setInterval(() => net.sendShips(), NET.STATE_MS);
setInterval(() => net.sendMarkets(), NET.MARKET_MS);
setInterval(() => net.sendFleetStats(), 5000);
setInterval(() => {
  const r = game.save();
  if (r.ms > 200) console.log(`Gespeichert: ${r.rows} Zeilen in ${r.ms} ms`);
}, NET.SAVE_MS);

let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  console.log('Speichere Spielstand ...');
  game.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log(`Space Trader läuft auf http://localhost:${PORT}`));
