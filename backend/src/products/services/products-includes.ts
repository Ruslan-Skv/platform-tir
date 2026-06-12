export const productCardVariantsInclude = {
  cardVariants: { orderBy: { sortOrder: 'asc' as const } },
};

export const productCardBadgeSelectionsInclude = {
  cardBadgeSelections: {
    orderBy: { sortOrder: 'asc' as const },
    include: { badge: true },
  },
};

export const productCreatedByUpdatedByInclude = {
  createdBy: { select: { email: true } },
  updatedBy: { select: { email: true } },
};
