import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateServiceCatalogBlockDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  showPricesInPublic?: boolean;
}
