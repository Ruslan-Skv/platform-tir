import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';

export class CreateCoatingMaterialDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;
}
