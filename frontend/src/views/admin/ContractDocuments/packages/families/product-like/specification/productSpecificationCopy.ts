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
      hint: 'Спецификация дверей готовится в отдельной программе. Укажите итоговую стоимость и прикрепите файл с эскизом и расчётом (PDF, Office, изображения, архивы, DWG и др.).',
      a4Title: 'Спецификация дверей',
    };
  }
  return {
    hint: 'Спецификация ПВХ-изделий готовится в отдельной программе. Укажите итоговую стоимость и прикрепите файл с эскизом и расчётом (PDF, Office, изображения, архивы, DWG и др.).',
    a4Title: 'Спецификация',
  };
}
