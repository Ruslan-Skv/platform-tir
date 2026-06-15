import { PrismaClient } from '@prisma/client';
import { seedQuizMebel } from './seed-quiz-mebel';

const prisma = new PrismaClient();

seedQuizMebel(prisma)
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
