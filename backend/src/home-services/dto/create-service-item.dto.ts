import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, MaxLength } from 'class-validator';

export class CreateServiceItemDto {
  @ApiProperty({ example: 'Ремонт под ключ' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Полный цикл от дизайна до чистовой отделки' })
  @IsString()
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    example: ['Дизайн-проект', 'Черновые работы', 'Чистовая отделка'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({ example: 'от 5 000 ₽/м²' })
  @IsString()
  @MaxLength(100)
  price: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
}
