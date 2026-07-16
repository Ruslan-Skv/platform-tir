import { IsString, MinLength } from 'class-validator';

export class MergeAttributeDto {
  /** ID характеристики, которую вливаем и затем удаляем. */
  @IsString()
  @MinLength(1)
  sourceId: string;
}
