import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { KnowledgeMaterialType, PageStatus } from '@prisma/client';
import { KnowledgeAttachmentDto } from './knowledge-attachment.dto';

export class CreateKnowledgeMaterialDto {
  @IsString()
  categoryId: string;

  @IsEnum(KnowledgeMaterialType)
  type: KnowledgeMaterialType;

  @IsString()
  title: string;

  @IsString()
  slug: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  externalUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsEnum(PageStatus)
  @IsOptional()
  status?: PageStatus;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeAttachmentDto)
  attachments?: KnowledgeAttachmentDto[];
}
