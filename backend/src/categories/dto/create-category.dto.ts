import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, IsUUID, Min } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Двери' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'doors' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ example: 'Описание категории', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '/images/categories/doors.jpg', required: false })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiProperty({ example: 0, default: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiProperty({ example: true, default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
