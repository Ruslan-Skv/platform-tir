/**
 * Инъекция версии в sw.js при сборке.
 * Меняет содержимое файла, чтобы браузер обнаружил новую версию SW после деплоя.
 */
const fs = require('fs');
const path = require('path');

const swPath = path.join(__dirname, '..', 'public', 'sw.js');
let content = fs.readFileSync(swPath, 'utf8');

const buildId =
  process.env.BUILD_ID ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  Date.now().toString(36);
content = content.replace('__BUILD_ID__', buildId);

fs.writeFileSync(swPath, content);
console.log('[inject-sw-version] SW version set to:', buildId);
