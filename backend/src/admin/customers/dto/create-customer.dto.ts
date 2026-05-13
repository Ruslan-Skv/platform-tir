import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  IsObject,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum LeadSource {
  WEBSITE = 'WEBSITE',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  REFERRAL = 'REFERRAL',
  SOCIAL = 'SOCIAL',
  ADVERTISING = 'ADVERTISING',
  EXHIBITION = 'EXHIBITION',
  OTHER = 'OTHER',
}

export enum CustomerStatus {
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  CUSTOMER = 'CUSTOMER',
  INACTIVE = 'INACTIVE',
  CHURNED = 'CHURNED',
}

export enum DealStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
}

export enum CustomerEntityType {
  PERSON = 'PERSON',
  COMPANY = 'COMPANY',
  ENTREPRENEUR = 'ENTREPRENEUR',
}

export class CreateCustomerDto {
  /** Если не указан, на бэкенде создаётся уникальный служебный адрес (карточка «с замера», дозаполнение позже). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsEmail()
  email?: string;

  @IsString()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @IsOptional()
  phones?: string[];

  @IsString()
  @IsOptional()
  company?: string;

  @IsString()
  @IsOptional()
  position?: string;

  @IsEnum(LeadSource)
  @IsOptional()
  source?: LeadSource;

  @IsEnum(CustomerStatus)
  @IsOptional()
  status?: CustomerStatus;

  @IsEnum(DealStage)
  @IsOptional()
  stage?: DealStage;

  @IsNumber()
  @IsOptional()
  dealValue?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  managerId?: string;

  @IsDateString()
  @IsOptional()
  nextFollowUp?: string;

  @IsEnum(CustomerEntityType)
  @IsOptional()
  entityType?: CustomerEntityType;

  @IsObject()
  @IsOptional()
  extendedProfile?: Record<string, unknown>;
}
