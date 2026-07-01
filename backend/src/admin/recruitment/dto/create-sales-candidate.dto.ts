import {
  IsString,
  IsOptional,
  IsEmail,
  IsInt,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SalesCandidateStatus } from '@prisma/client';

export class WorkHistoryItemDto {
  @IsString()
  company: string;

  @IsString()
  position: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  duties?: string;

  @IsOptional()
  @IsString()
  achievements?: string;
}

export class CreateSalesCandidateDto {
  @IsString()
  lastName: string;

  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsString()
  educationInstitution?: string;

  @IsOptional()
  @IsString()
  educationSpecialty?: string;

  @IsOptional()
  @IsInt()
  educationYear?: number;

  @IsOptional()
  @IsString()
  additionalEducation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalExperienceYears?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salesExperienceYears?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkHistoryItemDto)
  workHistory?: WorkHistoryItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  industryExperience?: string[];

  @IsOptional()
  @IsString()
  salesAchievements?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  communicationSkill?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  stressResistance?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  motivation?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  teamworkSkill?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  selfOrganization?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  pcSkill?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  presentationSkill?: number;

  @IsOptional()
  @IsString()
  motivationReason?: string;

  @IsOptional()
  @IsString()
  salaryExpectation?: string;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsBoolean()
  hasDriversLicense?: boolean;

  @IsOptional()
  @IsBoolean()
  hasPersonalCar?: boolean;

  @IsOptional()
  @IsBoolean()
  readyForTravel?: boolean;

  @IsOptional()
  @IsString()
  plannedTenure?: string;

  @IsOptional()
  @IsBoolean()
  readyToStudyWorkInfo?: boolean;

  @IsOptional()
  @IsBoolean()
  readyForContinuousLearning?: boolean;

  @IsOptional()
  @IsString()
  productKnowledge?: string;

  @IsOptional()
  @IsDateString()
  interviewDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  interviewScore?: number;

  @IsOptional()
  @IsString()
  interviewNotes?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  resumeFileUrl?: string;

  @IsOptional()
  @IsString()
  resumeFileName?: string;

  @IsOptional()
  @IsString()
  traineeUserId?: string;

  @IsOptional()
  @IsEnum(SalesCandidateStatus)
  status?: SalesCandidateStatus;
}
