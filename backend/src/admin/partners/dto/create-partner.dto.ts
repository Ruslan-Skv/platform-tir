import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsArray,
  IsUrl,
} from 'class-validator';

export class CreatePartnerDto {
  @IsString()
  name: string;

  @IsUrl()
  @IsOptional()
  logoUrl?: string;

  @IsBoolean()
  @IsOptional()
  showLogoOnCards?: boolean;

  @IsString()
  @IsOptional()
  tooltipText?: string;

  @IsBoolean()
  @IsOptional()
  showTooltip?: boolean;

  @IsString()
  @IsOptional()
  website?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  phone?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;
}
