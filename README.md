# Fighting Pet — Server Multiplayer

## Menjalankan di komputer
1. Pasang Node.js 18+ (https://nodejs.org).
2. Di folder ini: `npm install` lalu `npm start`.
3. Buka `http://localhost:8080` (game dilayani dari `index.html`). Buka di dua tab/perangkat untuk mencoba.

## Menayangkan online (supaya teman bisa ikut)
- Unggah folder ini ke layanan hosting Node (Render, Railway, Fly.io, dsb.). Perintah start: `npm start`. Layanan itu memberi alamat `https://...`; game otomatis memakai `wss://` yang sama.
- Opsional: set env `ALLOWED_ORIGIN=https://alamatmu` agar hanya situsmu yang bisa terhubung.
- Game dari tempat lain? Tambahkan `?server=wss://alamat-server` di URL.

## Fitur
Pemain terlihat di peta, chat, dan duel latihan (salinan tim lawan). Server memvalidasi nama, posisi, dan ukuran pesan, serta membatasi kecepatan kirim.
## Belum ada
Akun/login, penyimpanan di server, tukar pet, dan duel dua pemain langsung dengan perhitungan di server.
