import { PrismaClient } from '@prisma/client';
import { seedQuizRemont } from './seed-quiz-remont';

const prisma = new PrismaClient();

seedQuizRemont(prisma)
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
