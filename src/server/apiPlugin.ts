import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { Plugin } from 'vite';
import type { IncomingMessage } from 'node:http';

const DB_PATH = path.resolve(process.cwd(), 'data/links.json');
const TEXTS_DB_PATH = path.resolve(process.cwd(), 'data/texts.json');

// Ensure db exists helper
async function ensureDb(dbPath = DB_PATH, emptyValue = '[]') {
  try {
    await fs.access(dbPath);
  } catch {
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    await fs.writeFile(dbPath, emptyValue);
  }
}

/** Resolve a human-readable identity from the request — IP or hostname. */
function resolveClientName(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    if (ip && ip !== '::1' && ip !== '127.0.0.1') return ip;
  }
  const addr = (req.socket as any)?.remoteAddress ?? '';
  if (addr && addr !== '::1' && addr !== '127.0.0.1') return addr;
  // fallback to server hostname
  return os.hostname();
}

export function apiPlugin(): Plugin {
  return {
    name: 'vite-plugin-links-api',
    configureServer(server) {

      // ── /api/texts ──────────────────────────────────────────────────────────
      server.middlewares.use('/api/texts', async (req, res, next) => {
        await ensureDb(TEXTS_DB_PATH);
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          const data = await fs.readFile(TEXTS_DB_PATH, 'utf-8');
          res.end(data);
          return;
        }

        let bodyStr = '';
        req.on('data', (chunk) => { bodyStr += chunk.toString(); });

        req.on('end', async () => {
          try {
            const raw = await fs.readFile(TEXTS_DB_PATH, 'utf-8');
            let texts: any[] = JSON.parse(raw);

            if (req.method === 'POST') {
              const body = JSON.parse(bodyStr);
              const newItem = {
                id: Date.now(),
                title: body.title,
                content: body.content,
                name: resolveClientName(req),
                timestamp: new Date().toISOString(),
              };
              texts.push(newItem);
              await fs.writeFile(TEXTS_DB_PATH, JSON.stringify(texts, null, 2));
              res.end(JSON.stringify(newItem));
              return;
            }

            const idMatch = req.url?.match(/^\/(\d+)$/);

            if (req.method === 'PUT' && idMatch) {
              const id = Number(idMatch[1]);
              const body = JSON.parse(bodyStr);
              texts = texts.map((t) =>
                t.id === id
                  ? { ...t, title: body.title, content: body.content }
                  : t
              );
              await fs.writeFile(TEXTS_DB_PATH, JSON.stringify(texts, null, 2));
              res.end(JSON.stringify({ success: true }));
              return;
            }

            if (req.method === 'DELETE' && idMatch) {
              const id = Number(idMatch[1]);
              texts = texts.filter((t) => t.id !== id);
              await fs.writeFile(TEXTS_DB_PATH, JSON.stringify(texts, null, 2));
              res.end(JSON.stringify({ success: true }));
              return;
            }

            next();
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      });

      // ── /api/links ──────────────────────────────────────────────────────────
      server.middlewares.use('/api/links', async (req, res, next) => {
        await ensureDb(DB_PATH);
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'GET') {
          const data = await fs.readFile(DB_PATH, 'utf-8');
          res.end(data);
          return;
        }

        // Handle body parsing for POST/PUT/DELETE
        let bodyStr = '';
        req.on('data', chunk => {
          bodyStr += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const data = await fs.readFile(DB_PATH, 'utf-8');
            let links: any[] = JSON.parse(data);

            if (req.method === 'POST') {
              const newItem = JSON.parse(bodyStr);
              newItem.id = Date.now(); // assign simple random ID
              links.push(newItem);
              await fs.writeFile(DB_PATH, JSON.stringify(links, null, 2));
              res.end(JSON.stringify(newItem));
              return;
            }

            // Extract ID for PUT and DELETE (e.g. /api/links/1234)
            const idMatch = req.url?.match(/^\/(\d+)$/);
            
            if (req.method === 'PUT' && idMatch) {
              const id = Number(idMatch[1]);
              const updatedItem = JSON.parse(bodyStr);
              links = links.map(l => (l.id === id ? { ...l, ...updatedItem, id } : l));
              await fs.writeFile(DB_PATH, JSON.stringify(links, null, 2));
              res.end(JSON.stringify({ success: true }));
              return;
            }

            if (req.method === 'DELETE' && idMatch) {
              const id = Number(idMatch[1]);
              links = links.filter(l => l.id !== id);
              await fs.writeFile(DB_PATH, JSON.stringify(links, null, 2));
              res.end(JSON.stringify({ success: true }));
              return;
            }

            // If we reach here, it's either an unhandled route or missing ID
            next();
          } catch (e) {
            console.error(e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Internal Server Error' }));
          }
        });
      });
    }
  };
}
