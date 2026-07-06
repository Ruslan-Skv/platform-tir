/**
 * Копирует Workbox в public/workbox/ для Service Worker (CSP: script-src 'self').
 */
const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const outDir = path.join(frontendRoot, 'public', 'workbox');

const files = [
  ['workbox-sw/build/workbox-sw.js', 'workbox-sw.js'],
  ['workbox-core/build/workbox-core.prod.js', 'workbox-core.prod.js'],
  ['workbox-routing/build/workbox-routing.prod.js', 'workbox-routing.prod.js'],
  ['workbox-strategies/build/workbox-strategies.prod.js', 'workbox-strategies.prod.js'],
  ['workbox-expiration/build/workbox-expiration.prod.js', 'workbox-expiration.prod.js'],
];

fs.mkdirSync(outDir, { recursive: true });

for (const [srcRel, destName] of files) {
  const src = path.join(
    frontendRoot,
    'node_modules',
    srcRel.split('/')[0],
    ...srcRel.split('/').slice(1)
  );
  const dest = path.join(outDir, destName);
  if (!fs.existsSync(src)) {
    console.error(`[copy-workbox] Missing: ${src}`);
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
}

console.log('[copy-workbox] Workbox copied to public/workbox/');
