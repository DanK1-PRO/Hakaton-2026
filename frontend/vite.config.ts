import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

function maplibreWorkerAsset(): Plugin {
  return {
    name: 'maplibre-worker-asset',
    apply: 'build',
    closeBundle() {
      const distDir = resolve(process.cwd(), 'dist/assets');
      const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'];
      for (const name of files) {
        const src = resolve(process.cwd(), 'node_modules/maplibre-gl/dist', name);
        if (existsSync(src)) {
          copyFileSync(src, join(distDir, name));
        }
      }
    },
  };
}

function pmtilesRange(): Plugin {
  const middleware = (publicDir: string) => (req: any, res: any, next: () => void) => {
    try {
      const path = (req.url || '').split('?')[0];
      if (!path.endsWith('.pmtiles') || path.includes('..')) return next();
      const file = join(publicDir, decodeURIComponent(path).replace(/^[/\\]+/, ''));
      if (!existsSync(file)) return next();
      const stat = statSync(file);
      res.setHeader('Accept-Ranges', 'bytes');
      if (req.method === 'HEAD') {
        res.statusCode = 200;
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Content-Type', 'application/octet-stream');
        res.end();
        return;
      }
      const range = req.headers.range;
      const match = range ? /^bytes=(\d*)-(\d*)$/.exec(String(range).trim()) : null;
      if (match) {
        const start = match[1] ? Number(match[1]) : 0;
        const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
        if (start >= stat.size || start > end || Number.isNaN(start) || Number.isNaN(end)) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${stat.size}`);
          res.end();
          return;
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', String(end - start + 1));
        res.setHeader('Content-Type', 'application/octet-stream');
        createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Length', String(stat.size));
      res.setHeader('Content-Type', 'application/octet-stream');
      createReadStream(file).pipe(res);
    } catch {
      next();
    }
  };
  return {
    name: 'pmtiles-range',
    configureServer(server) {
      server.middlewares.use(middleware(resolve(server.config.publicDir)));
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware(resolve(server.config.root, 'public')));
    },
  };
}

export default defineConfig({
  plugins: [react(), pmtilesRange(), maplibreWorkerAsset()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000', '/health': 'http://127.0.0.1:8000' },
  },
  preview: {
    port: 4173,
    proxy: { '/api': 'http://127.0.0.1:8000', '/health': 'http://127.0.0.1:8000' },
  },
});
