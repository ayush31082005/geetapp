/**
 * GeetPay — Local Production Server
 * Serves the built Vite app (dist/) on localhost.
 *
 * HOW TO RUN LOCALLY:
 * ─────────────────────────────────────────────────────
 * Option A — Development mode (live reload, recommended):
 *   1. pnpm install
 *   2. pnpm dev
 *   3. Open http://localhost:5173
 *
 * Option B — Production build then serve:
 *   1. pnpm install
 *   2. pnpm build           ← builds React app into /dist
 *   3. pnpm preview         ← Vite preview server on :4173
 *      OR
 *      npx tsx server.ts    ← this file, port 3000
 * ─────────────────────────────────────────────────────
 *
 * Run with:  npx tsx server.ts
 * Or compile: npx tsc server.ts --module esnext && node server.js
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFile, existsSync } from 'fs';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname: string = fileURLToPath(new URL('.', import.meta.url));
const PORT: number = Number(process.env.PORT) || 3000;
const DIST_DIR: string = join(__dirname, 'dist');

if (!existsSync(DIST_DIR)) {
  console.error('\n❌  /dist folder not found. Run  pnpm build  first.\n');
  process.exit(1);
}

const MIME: Record<string, string> = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'text/javascript; charset=utf-8',
  '.mjs':   'text/javascript; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.webp':  'image/webp',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.json':  'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
};

function serveFile(filePath: string, res: ServerResponse): void {
  readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const mime = MIME[extname(filePath)] || 'application/octet-stream';
    const isHtml = filePath.endsWith('.html');
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': isHtml
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  });
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = (req.url ?? '/').split('?')[0];
  const safePath = url.replace(/\.\./g, '');
  const filePath = join(DIST_DIR, safePath === '/' ? 'index.html' : safePath);

  readFile(filePath, (err) => {
    if (!err) {
      serveFile(filePath, res);
    } else {
      // SPA fallback — serve index.html for client-side routing
      serveFile(join(DIST_DIR, 'index.html'), res);
    }
  });
});

server.listen(PORT, () => {
  console.log('\n🚀  GeetPay is running!');
  console.log(`   → http://localhost:${PORT}\n`);
  console.log('   Press Ctrl+C to stop.\n');
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌  Port ${PORT} in use. Try: PORT=3001 npx tsx server.ts\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
