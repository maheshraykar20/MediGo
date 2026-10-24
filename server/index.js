import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { handleApiRequest } from './apiRouter.js';
import { DB_DIR, verifyDatabasePersistence } from './dbService.js';

const PORT = process.env.PORT || 5001;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer(async (req, res) => {
  // Apply Security Headers to every response
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self)');

  try {
    // 1. Try handling API routes
    const handled = await handleApiRequest(req, res);
    if (handled) return;

    // 2. Serve static files from dist/ if built
    if (fs.existsSync(DIST_DIR)) {
      const parsedUrl = url.parse(req.url);
      let pathname = parsedUrl.pathname;

      if (pathname === '/') {
        pathname = '/index.html';
      }

      let filePath = path.join(DIST_DIR, pathname);

      // If file doesn't exist directly, check if it's admin or general SPA route
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        if (pathname.startsWith('/admin')) {
          filePath = path.join(DIST_DIR, 'admin.html');
        } else {
          filePath = path.join(DIST_DIR, 'index.html');
        }
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  } catch (err) {
    // Server-only logging to prevent information leakage (Addresses audit finding 1)
    console.error('[CRITICAL_SERVER_ERROR]', req.method, req.url, err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal Server Error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MedVault Server running on port ${PORT}`);
  
  // Real storage verification (Addresses audit finding 3)
  const persistenceInfo = verifyDatabasePersistence();
  console.log(`📁 Database storage path: ${persistenceInfo.dbDir}`);
  console.log(`🔒 Disk write verification: ${persistenceInfo.writable ? 'PASSED (Verified Writable)' : 'FAILED'}`);
  console.log(`📦 Registered SQLite databases on disk: ${persistenceInfo.filesCount} files`);
  if (persistenceInfo.isCustomDataDir) {
    console.log(`💾 Custom/Persistent Disk detected via: ${persistenceInfo.customDataDirSource}`);
  } else {
    console.log(`ℹ️ Persistent disk note: Render Persistent Disk can be enabled via DATA_DIR environment variable.`);
  }
  console.log(`🌐 Web root: ${DIST_DIR}`);
});
