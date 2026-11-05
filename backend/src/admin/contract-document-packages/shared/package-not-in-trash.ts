/**
 * Общее условие для выборок сущностей с nullable-привязкой к пакету документов
 * (`packageId` → ContractDocumentPackage): показываем только записи договоров,
 * не отправленных в корзину пакетов документов. Подкладывается в `AND` where
 * нужной модели — поэтому без prisma-типа (where-инпуты у моделей разные).
 */
export const PACKAGE_NOT_IN_TRASH = {
  OR: [{ packageId: null }, { package: { deletedAt: null } }],
};
