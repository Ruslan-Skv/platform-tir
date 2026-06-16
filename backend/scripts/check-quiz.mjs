import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  const quiz = await prisma.knowledgeMaterialQuiz.findFirst({
    where: { materialId: 'km_sales_m01_t01' },
  });
  console.log(JSON.stringify(quiz, null, 2));
} catch (error) {
  console.error(error);
} finally {
  await prisma.$disconnect();
}
