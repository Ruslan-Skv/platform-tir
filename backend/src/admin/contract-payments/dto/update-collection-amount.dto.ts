import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCollectionAmountDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  collectionAmount?: number | null;
}
