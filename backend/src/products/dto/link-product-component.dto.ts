import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class LinkProductComponentDto {
  @IsString()
  catalogItemId: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  sortOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class LinkProductComponentsBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  catalogItemIds: string[];
}
