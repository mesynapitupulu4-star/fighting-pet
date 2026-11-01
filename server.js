// Fighting Pet — server multiplayer (Node.js + WebSocket)
// Jalankan: npm install && npm start   ->  buka http://localhost:8080
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const PUB = __dirname;
const FILES = new Set(['/index.html', '/net-client.js']); // hanya dua file ini yang disajikan
const ALLOW = process.env.ALLOWED_ORIGIN || ''; // isi mis. https://gamemu.com untuk membatasi asal
const MAX_PLAYERS = 100;
const TOPICS = new Set(['chat', 'tq', 'tr']);   // chat, minta tim, kirim tim (duel)
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };

// ---------- HTTP: menyajikan game (index.html + net-client.js) ----------
const server = http.createServer((req, res) => {
  let u = decodeURIComponent((req.url || '/').split('?')[0]);
  if (u === '/') u = '/index.html';
  if (!FILES.has(u)) { res.writeHead(404); return res.end('Not found'); }
  const f = path.join(PUB, u);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({
  server,
  maxPayload: 4096, // pesan lebih besar langsung ditolak
  verifyClient: (info) => !ALLOW || info.origin === ALLOW,
});

const peers = new Map(); // id -> {id, ws, presence, at, tokens, alive, lastChat}
let seq = 0, dirty = false;
const newId = () => Math.random().toString(36).slice(2, 10) + (++seq).toString(36);
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, n);
const int = (v, a, b) => Number.isInteger(v) && v >= a && v <= b;
const send = (ws, obj) => { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); };

wss.on('connection', (ws) => {
  if (peers.size >= MAX_PLAYERS) return ws.close(1013, 'Server penuh');
  const p = { id: newId(), ws, presence: {}, at: Date.now(), tokens: 40, alive: true, lastChat: 0 };
  peers.set(p.id, p);
  send(ws, { k: 'welcome', peer: p.id });
  dirty = true;

  ws.on('pong', () => { p.alive = true; });
  ws.on('error', () => {});
  ws.on('close', () => { peers.delete(p.id); dirty = true; });

  ws.on('message', (raw) => {
    if (--p.tokens < 0) return;                       // batas ~40 pesan/detik per pemain
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== 'object') return;

    if (m.k === 'presence' && m.p && typeof m.p === 'object') {
      const q = m.p, o = p.presence;                  // hanya field yang divalidasi yang diterima
      if (q.n !== undefined) o.n = clean(q.n, 16) || 'Pemain';
      if (int(q.x, 0, 215)) o.x = q.x;                // ukuran peta 216 x 190
      if (int(q.y, 0, 189)) o.y = q.y;
      if (int(q.sp, 0, 107)) o.sp = q.sp;             // 108 spesies
      if (q.b === 0 || q.b === 1) o.b = q.b;
      p.at = Date.now(); dirty = true;
    } else if (m.k === 'emit' && TOPICS.has(m.topic)) {
      let data = m.data;
      if (m.topic === 'chat') {
        const now = Date.now();
        if (now - p.lastChat < 700) return;           // anti-spam
        p.lastChat = now;
        data = { n: clean(data && data.n, 16), t: clean(data && data.t, 120) };
        if (!data.t) return;
      }
      const out = JSON.stringify({ k: 'msg', topic: m.topic, data, peer: p.id });
      if (out.length > 3000) return;
      if (m.topic === 'chat') peers.forEach((o) => o.ws.readyState === 1 && o.ws.send(out));
      else { // tq/tr dikirim langsung ke pemain tujuan (dan gema ke pengirim)
        const t = peers.get(data && data.to);
        if (t && t.ws.readyState === 1) t.ws.send(out);
        if (ws.readyState === 1) ws.send(out);
      }
    }
  });
});

// siarkan daftar pemain 10x/detik jika ada perubahan; isi ulang kuota pesan tiap detik
setInterval(() => {
  if (!dirty) return; dirty = false;
  const list = [...peers.values()].map((p) => ({ peer: p.id, presence: p.presence, updatedAt: p.at }));
  const out = JSON.stringify({ k: 'peers', list });
  peers.forEach((p) => p.ws.readyState === 1 && p.ws.send(out));
}, 100);
setInterval(() => peers.forEach((p) => { p.tokens = 40; }), 1000);
// buang koneksi mati
setInterval(() => peers.forEach((p) => {
  if (!p.alive) return p.ws.terminate();
  p.alive = false; p.ws.ping();
}), 30000);

server.listen(PORT, () => console.log(`Fighting Pet server berjalan di http://localhost:${PORT}`));
