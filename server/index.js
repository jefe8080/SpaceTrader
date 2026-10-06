import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { NET } from '../shared/config.js';
import { Game } from './game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.static(path.join(root, 'client')));
app.use('/shared', express.static(path.join(root, 'shared')));

const server = http.createServer(app);
const io = new Server(server);
const game = new Game(path.join(root, 'data', 'save.json'));

const broadcastPlayers = () => io.emit('players', game.playerList());

io.on('connection', (socket) => {
  let player = null;
  socket.emit('players', game.playerList());

  socket.on('login', (msg) => {
    const name = String(msg?.name || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 20) return socket.emit('loginError', 'Name muss 2 bis 20 Zeichen lang sein.');
    player = game.findPlayerByName(name) || game.createPlayer(name);
    game.attach(player, socket);
    console.log(`Login: ${player.name}`);
    broadcastPlayers();
  });

  socket.on('cmd', (msg) => {
    if (!player || !msg || typeof msg.cmd !== 'string') return;
    try {
      const err = game.command(player, msg.cmd, msg);
      if (err) socket.emit('errorMsg', err);
    } catch (e) {
      console.error('Befehl fehlgeschlagen', msg, e);
      socket.emit('errorMsg', 'Interner Fehler beim Befehl.');
    }
  });

  socket.on('stats', (msg) => {
    if (!player) return;
    const data = game.statsFor(player, msg?.entityId);
    if (data) socket.emit('stats', data);
  });

  socket.on('disconnect', () => {
    if (!player) return;
    game.detach(player, socket);
    broadcastPlayers();
  });
});

let last = Date.now();
setInterval(() => {
  const now = Date.now();
  game.tick(Math.min(0.5, (now - last) / 1000));
  last = now;
}, NET.TICK_MS);
setInterval(() => game.sendStates(), NET.STATE_MS);
setInterval(() => game.sendMarkets(), NET.MARKET_MS);
setInterval(() => game.save(), NET.SAVE_MS);

const shutdown = () => {
  console.log('Speichere Spielstand ...');
  game.save();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log(`Space Trader läuft auf http://localhost:${PORT}`));
