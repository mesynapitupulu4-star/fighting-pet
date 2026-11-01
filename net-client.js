// Penghubung game ke server WebSocket. Meniru API "room" sehingga fitur 🌐 (peta, chat, duel) langsung jalan.
(function () {
  if (typeof window.claude !== 'undefined') return; // di halaman claude.ai pakai room bawaan
  const q = new URLSearchParams(location.search).get('server');
  const url = q || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
  let ws = null, me = null, open = false, list = [];
  const H = {}, CB = [], pres = {};
  const view = () => list.map((p) => ({ ...p, isMe: p.peer === me, sameTab: p.peer === me, kind: 'viewer', guest: false }));
  const tx = (o) => { if (ws && open) ws.send(JSON.stringify(o)); };
  function connect() {
    try { ws = new WebSocket(url); } catch (e) { return setTimeout(connect, 3000); }
    ws.onopen = () => { open = true; if (Object.keys(pres).length) tx({ k: 'presence', p: pres }); };
    ws.onclose = () => { open = false; list = []; CB.forEach((f) => f(view())); setTimeout(connect, 3000); };
    ws.onerror = () => {};
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.k === 'welcome') me = m.peer;
      else if (m.k === 'peers') { list = m.list; CB.forEach((f) => f(view())); }
      else if (m.k === 'msg') (H[m.topic] || []).forEach((f) => f({ topic: m.topic, data: m.data, peer: m.peer, isMe: m.peer === me, sameTab: m.peer === me, kind: 'viewer', guest: false }));
    };
  }
  const room = {
    connected: () => open,
    onPeers: (f) => { CB.push(f); f(view()); return () => { CB.splice(CB.indexOf(f), 1); }; },
    on: (t, f) => { (H[t] = H[t] || []).push(f); return () => { H[t].splice(H[t].indexOf(f), 1); }; },
    emit: async (topic, data) => tx({ k: 'emit', topic, data }),
    presence: (p) => { Object.assign(pres, p); tx({ k: 'presence', p }); },
  };
  window.claude = { use: async (n) => (n === 'room' ? room : null) };
  connect();
})();
