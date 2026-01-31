import { IsString, MinLength } from 'class-validator';

export class ReplyCommentDto {
  @IsString()
  @MinLength(1, { message: 'Ответ не может быть пустым' })
  content: string;
}
