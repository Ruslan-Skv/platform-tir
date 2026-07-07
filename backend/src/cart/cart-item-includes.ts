/** Общие Prisma include для позиций корзины (товар, комплектующее, вариант). */

export const cartProductWithCategoryInclude = {
  category: true,
  coatingMaterial: { select: { id: true, name: true, slug: true } },
} as const;

export const cartComponentWithProductInclude = {
  product: { select: { id: true, name: true, slug: true } },
} as const;

export const cartItemProductInclude = {
  product: { include: cartProductWithCategoryInclude },
  component: true,
  cardVariant: true,
} as const;

export const cartItemProductOnlyInclude = {
  product: { include: cartProductWithCategoryInclude },
  component: true,
} as const;

export const cartItemListInclude = {
  product: { include: cartProductWithCategoryInclude },
  component: { include: cartComponentWithProductInclude },
  cardVariant: true,
} as const;

export const cartComponentItemInclude = {
  component: { include: cartComponentWithProductInclude },
  product: true,
} as const;
