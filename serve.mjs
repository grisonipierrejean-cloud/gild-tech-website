import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

createServer(async (req, res) => {
  const pathOnly = req.url.split('?')[0];
  const file = pathOnly === '/' || pathOnly.endsWith('/') ? pathOnly + 'index.html' : pathOnly;
  try {
    const data = await readFile(join(__dirname, file));
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'text/html' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(8082, () => console.log('Server running on http://localhost:8082'));
