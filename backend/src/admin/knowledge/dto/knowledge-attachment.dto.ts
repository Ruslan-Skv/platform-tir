import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class KnowledgeAttachmentDto {
  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  fileSize?: number;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
