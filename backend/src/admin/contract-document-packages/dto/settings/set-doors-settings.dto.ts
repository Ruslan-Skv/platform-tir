import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class SetDoorsContractSettingsDto {
  /**
   * Поставщики колонки «Поставщик» в Спецификации договоров «Двери» (id из справочника).
   * Повторы и id поставщиков, которых нет в справочнике, сервис отбрасывает сам.
   */
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  specificationSupplierIds: string[];
}
