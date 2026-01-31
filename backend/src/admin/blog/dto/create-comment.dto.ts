import { IsString, IsOptional, IsEmail, MinLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1, { message: 'Комментарий не может быть пустым' })
  content: string;

  @IsString()
  @IsOptional()
  authorName?: string;

  @IsEmail()
  @IsOptional()
  authorEmail?: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}
