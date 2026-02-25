import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateOtherExpenseCollectionDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  collectionAmount?: number | null;
}
