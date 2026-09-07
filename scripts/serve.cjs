const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.otf': 'font/otf', '.json': 'application/json' };
const server = http.createServer((request, response) => {
  let filename;
  try { const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)); } catch { response.writeHead(400); response.end('Bad request'); return; }
  if (!filename.startsWith(root + path.sep) || path.relative(root,filename).split(path.sep).some(p => p.startsWith('.')) || !types[path.extname(filename)]) { response.writeHead(404); response.end('Not found'); return; }
  fs.readFile(filename, (error, data) => { if (error) { response.writeHead(404); response.end('Not found'); return; } response.writeHead(200, { 'Content-Type': types[path.extname(filename)], 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' }); response.end(data); });
});
let port = Number(process.env.PORT) || 4173;
server.on('error', error => { if (error.code === 'EADDRINUSE' && port < 4190) server.listen(++port, '127.0.0.1'); else { console.error(error.message); process.exit(1); } });
server.listen(port, '127.0.0.1', () => console.log(`Prystech Webview: http://127.0.0.1:${port}`));
