// PRD 15: lokaler Hilfsserver für die Schiffsillustrationen. Liefert den Generator aus und speichert gerenderte PNGs.
// Aufruf: node scripts/art/save-server.mjs client/assets/art/ships  (danach http://127.0.0.1:3099 öffnen)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/save') {
    const name = url.searchParams.get('name');
    if (!/^ship_[a-z]+\.png$/.test(name)) { res.writeHead(400); return res.end('bad name'); }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      fs.writeFileSync(path.join(out, name), Buffer.from(body.replace(/^data:image\/png;base64,/, ''), 'base64'));
      res.writeHead(200); res.end('ok ' + name);
    });
    return;
  }
  const f = path.join(dir, url.pathname === '/' ? 'gen.html' : url.pathname.slice(1));
  if (!f.startsWith(dir) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' });
  res.end(fs.readFileSync(f));
}).listen(3099, '127.0.0.1', () => console.log('art server 3099 ->', out));
