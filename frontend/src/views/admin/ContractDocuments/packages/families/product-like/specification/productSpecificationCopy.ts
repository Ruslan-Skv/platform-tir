import type { ProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';

export type ProductSpecificationCopy = {
  hint: string;
  a4Title: string;
};

export function productSpecificationCopy(
  packageKind: ProductDirectionPackageKind
): ProductSpecificationCopy {
  if (packageKind === 'DOORS') {
    return {
      hint: 'Заполните позиции спецификации вручную: двери, фурнитура, наличники, доборы и другие комплектующие. Итог по строкам учитывается в стоимости изделий по договору.',
      a4Title: 'Спецификация',
    };
  }
  return {
    hint: 'Спецификация ПВХ-изделий готовится в отдельной программе. Укажите итоговую стоимость и прикрепите файл с эскизом и расчётом (PDF, Office, изображения, архивы, DWG и др.).',
    a4Title: 'Спецификация',
  };
}
