import fs from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

const DB_PATH = path.resolve(process.cwd(), 'data/links.json');

// Ensure db exists helper
async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify([]));
  }
}

export function apiPlugin(): Plugin {
  return {
    name: 'vite-plugin-links-api',
    configureServer(server) {
      server.middlewares.use('/api/links', async (req, res, next) => {
        await ensureDb();
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
