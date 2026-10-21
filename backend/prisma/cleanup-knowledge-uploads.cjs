/**
 * Зачистка осиротевших файлов в uploads/knowledge (production-friendly, без ts-node).
 *
 * Находит файлы, на которые не ссылается ни одна запись БД (материалы в корзине
 * и активные учитываются — их файлы не трогаются), и удаляет их с диска.
 * Это возвращает место, «утекшее» до того, как безвозвратное удаление из корзины
 * начало сносить файлы.
 *
 * Usage:
 *   node prisma/cleanup-knowledge-uploads.cjs           # dry-run: только показать
 *   node prisma/cleanup-knowledge-uploads.cjs --apply   # действительно удалить
 * Docker:
 *   docker compose exec backend node prisma/cleanup-knowledge-uploads.cjs --apply
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '../.env') });
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'knowledge');
const URL_PREFIX = '/uploads/knowledge/';

// Имена текстовых полей материала, где могут быть встроены ссылки на файлы
const MATERIAL_TEXT_FIELDS = [
  'excerpt',
  'content',
  'tutorRecommendation',
  'managerPracticalAssignment',
];

/** Абсолютный или относительный URL -> имя файла внутри uploads/knowledge, либо null. */
function filenameFromUrl(rawUrl) {
  const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
  if (!url) return null;

  let filename = null;
  if (url.startsWith(URL_PREFIX)) {
    filename = url.slice(URL_PREFIX.length);
  } else if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (!parsed.pathname.startsWith(URL_PREFIX)) return null;
      filename = parsed.pathname.slice(URL_PREFIX.length);
    } catch {
      return null;
    }
  } else {
    return null;
  }

  filename = filename.split('?')[0].split('#')[0];
  if (!filename || /[\\/]/.test(filename) || filename.includes('..')) return null;
  return filename;
}

async function collectReferencedFilenames() {
  const names = new Set();
  const add = (url) => {
    const name = filenameFromUrl(url);
    if (name) names.add(name);
  };

  const [materials, attachments, categories] = await Promise.all([
    prisma.knowledgeMaterial.findMany({
      select: {
        videoUrl: true,
        thumbnailUrl: true,
        ...Object.fromEntries(MATERIAL_TEXT_FIELDS.map((f) => [f, true])),
      },
    }),
    prisma.knowledgeMaterialAttachment.findMany({ select: { fileUrl: true } }),
    prisma.knowledgeCategory.findMany({ select: { image: true } }),
  ]);

  for (const material of materials) {
    add(material.videoUrl);
    add(material.thumbnailUrl);
    // Ссылки, встроенные в текст материалов (content и т.п.)
    for (const field of MATERIAL_TEXT_FIELDS) {
      const text = material[field];
      if (!text) continue;
      for (const match of text.matchAll(/\/uploads\/knowledge\/[^\s"'<>)\]]+/g)) {
        add(match[0]);
      }
    }
  }
  for (const attachment of attachments) add(attachment.fileUrl);
  for (const category of categories) add(category.image);

  return names;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  const apply = process.argv.includes('--apply');

  if (!fs.existsSync(UPLOADS_DIR)) {
    console.log(`Папка не найдена: ${UPLOADS_DIR} — удалять нечего.`);
    return;
  }

  console.log('Читаю ссылки на файлы из БД (включая материалы в корзине)...');
  const referenced = await collectReferencedFilenames();
  console.log(`Ссылок на локальные файлы: ${referenced.size}`);

  const orphans = fs
    .readdirSync(UPLOADS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !referenced.has(name));

  if (!orphans.length) {
    console.log('Осиротевших файлов не найдено.');
    return;
  }

  let totalBytes = 0;
  const rows = [];
  for (const name of orphans) {
    const stat = fs.statSync(path.join(UPLOADS_DIR, name));
    totalBytes += stat.size;
    rows.push(`  ${name}  (${formatSize(stat.size)}, изменён ${stat.mtime.toISOString()})`);
  }
  console.log(`\nОсиротевших файлов: ${orphans.length}, суммарно ${formatSize(totalBytes)}:`);
  console.log(rows.join('\n'));

  if (!apply) {
    console.log('\nDRY-RUN: ничего не удалено. Запустите с --apply, чтобы удалить эти файлы.');
    return;
  }

  let removed = 0;
  let freedBytes = 0;
  for (const name of orphans) {
    const filePath = path.join(UPLOADS_DIR, name);
    try {
      const stat = fs.statSync(filePath);
      fs.unlinkSync(filePath);
      removed += 1;
      freedBytes += stat.size;
    } catch (err) {
      console.error(`Не удалось удалить ${filePath}: ${err.message}`);
    }
  }
  console.log(
    `\nУдалено файлов: ${removed} из ${orphans.length}, освобождено ${formatSize(freedBytes)}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
