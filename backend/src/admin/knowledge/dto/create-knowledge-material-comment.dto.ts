import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateKnowledgeMaterialCommentDto {
  @IsString()
  @MinLength(1, { message: 'Комментарий не может быть пустым' })
  @MaxLength(2000, { message: 'Комментарий не должен превышать 2000 символов' })
  text!: string;
}
