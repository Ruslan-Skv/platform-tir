import { IsString, IsOptional, IsArray, IsBoolean, IsInt } from 'class-validator';

export class CreateComplexObjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerPhones?: string[];

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  hasElevator?: boolean;

  @IsOptional()
  @IsInt()
  floor?: number;

  @IsOptional()
  @IsString()
  officeId?: string;

  @IsOptional()
  @IsString()
  managerId?: string;
}
