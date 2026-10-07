import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../public');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = createServer(async (req, res) => {
  try {
    const requestPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const safePath = normalize(join(root, decodeURIComponent(requestPath)));
    if (!safePath.startsWith(root)) throw new Error('拒绝访问');
    const body = await readFile(safePath);
    res.writeHead(200, { 'Content-Type': types[extname(safePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

const port = Number(process.env.PORT || 4173);
server.listen(port, () => {
  console.log(`分红数据展示页已启动: http://localhost:${port}`);
});
