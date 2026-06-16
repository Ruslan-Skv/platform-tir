import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const htmlPath = path.join(__dirname, '../prisma/data/b2c-prodazhi-conspect.html');
const content = fs.readFileSync(htmlPath, 'utf8');
const audienceLabel = 'менеджеры по продажам (новые и действующие)';
const managerPracticalAssignment =
  'На ближайших 3 встречах целенаправленно определите психотип клиента и намеренно используйте минимум одну фразу, адаптированную под него. Запишите результат – повысилась ли его вовлеченность. Обсудите на планерке.';

const material = await prisma.knowledgeMaterial.findFirst({
  where: { slug: 'b2c-prodazhi-remont-osteklenie' },
  select: { id: true },
});

if (!material) {
  console.log('Material b2c-prodazhi-remont-osteklenie not found.');
} else {
  const audience =
    (await prisma.knowledgeTargetAudience.findUnique({ where: { label: audienceLabel } })) ??
    (await prisma.knowledgeTargetAudience.create({
      data: { label: audienceLabel, sortOrder: 0 },
    }));

  await prisma.knowledgeMaterial.update({
    where: { id: material.id },
    data: {
      content,
      readingTimeMinutes: 6,
      managerPracticalAssignment,
    },
  });

  await prisma.knowledgeMaterialTargetAudience.deleteMany({ where: { materialId: material.id } });
  await prisma.knowledgeMaterialTargetAudience.create({
    data: {
      materialId: material.id,
      audienceId: audience.id,
    },
  });

  console.log('Updated B2C conspect material with content and target audience.');
}

await prisma.$disconnect();
