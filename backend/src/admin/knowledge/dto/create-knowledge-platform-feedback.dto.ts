import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { KnowledgePlatformFeedbackType } from '@prisma/client';

export class CreateKnowledgePlatformFeedbackDto {
  @IsEnum(KnowledgePlatformFeedbackType, {
    message: 'Укажите тип: предложение или сообщение об ошибке',
  })
  type!: KnowledgePlatformFeedbackType;

  @IsString()
  @MinLength(1, { message: 'Текст не может быть пустым' })
  @MaxLength(4000, { message: 'Текст не должен превышать 4000 символов' })
  text!: string;
}
