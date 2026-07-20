const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.product
  .findFirst({
    where: { slug: 'tt-xxl-eliza-venge-vinorit' },
    select: { id: true, slug: true, name: true, images: true },
  })
  .then((r) => {
    console.log(JSON.stringify(r, null, 2));
    return p.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await p.$disconnect();
    process.exit(1);
  });
