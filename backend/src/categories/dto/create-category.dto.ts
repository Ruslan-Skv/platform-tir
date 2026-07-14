import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

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

  @ApiProperty({ example: '🚪', required: false, description: 'Emoji or icon name' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ required: false, description: 'Parent category ID (CUID format)' })
  @IsOptional()
  @IsString()
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

  @ApiProperty({
    example: true,
    default: true,
    required: false,
    description: 'Whether product sizes are required in this category',
  })
  @IsOptional()
  @IsBoolean()
  sizesRequired?: boolean;
}
