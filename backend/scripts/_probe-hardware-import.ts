import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.category.findUnique({
    where: { id: 'cmrkk0jq4002prjl64owdkzcl' },
    include: { parent: true, children: true },
  });
  console.log('target category', JSON.stringify(c, null, 2));

  const hw = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'урнитур', mode: 'insensitive' } },
        { name: { contains: 'учк', mode: 'insensitive' } },
        { slug: { contains: 'hardware', mode: 'insensitive' } },
        { slug: { contains: 'ruch', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true, parentId: true, sizesRequired: true },
  });
  console.log('related categories', JSON.stringify(hw, null, 2));

  const snap = await prisma.supplierPriceListSnapshot.findFirst({
    where: { category: 'HARDWARE' },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { rows: true } } },
  });
  console.log('latest HARDWARE snapshot', JSON.stringify(snap));

  if (snap) {
    const groups = await prisma.supplierPriceListRow.groupBy({
      by: ['blockTitle'],
      where: { snapshotId: snap.id },
      _count: true,
    });
    console.log('groups', JSON.stringify(groups, null, 2));

    const rows = await prisma.supplierPriceListRow.findMany({
      where: {
        snapshotId: snap.id,
        OR: [
          { blockTitle: { contains: 'учк', mode: 'insensitive' } },
          { itemName: { contains: 'учк', mode: 'insensitive' } },
        ],
      },
      take: 15,
    });
    console.log('sample handle rows', JSON.stringify(rows, null, 2));
    console.log(
      'handle rows count',
      await prisma.supplierPriceListRow.count({
        where: {
          snapshotId: snap.id,
          OR: [
            { blockTitle: { contains: 'учк', mode: 'insensitive' } },
            { itemName: { contains: 'учк', mode: 'insensitive' } },
          ],
        },
      }),
    );
  }

  const existing = await prisma.product.count({
    where: { categoryId: 'cmrkk0jq4002prjl64owdkzcl' },
  });
  console.log('existing products in target category', existing);

  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
    take: 20,
  });
  console.log('suppliers', JSON.stringify(suppliers, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
