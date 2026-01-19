import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum AttributeType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  COLOR = 'COLOR',
}

export class AttributeValueDto {
  @IsString()
  value: string;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class CreateAttributeDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsEnum(AttributeType)
  @IsOptional()
  type?: AttributeType;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsBoolean()
  @IsOptional()
  isFilterable?: boolean;

  @IsBoolean()
  @IsOptional()
  isRequired?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeValueDto)
  @IsOptional()
  values?: AttributeValueDto[];
}
