/** Общие Prisma include для позиций корзины (товар, комплектующее, вариант). */

/** Поставщики товара — для автозаполнения «Поставщика» в спецификации договора. */
export const cartProductSuppliersInclude = {
  select: {
    isMainSupplier: true,
    supplier: { select: { id: true, legalName: true, commercialName: true } },
  },
} as const;

export const cartProductWithCategoryInclude = {
  category: true,
  coatingMaterial: { select: { id: true, name: true, slug: true } },
  suppliers: cartProductSuppliersInclude,
} as const;

export const cartComponentWithProductInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      suppliers: cartProductSuppliersInclude,
    },
  },
  catalogItem: true,
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
