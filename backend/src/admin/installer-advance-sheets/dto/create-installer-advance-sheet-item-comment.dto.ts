import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

/** Комментарий в мини-переписке по строке ведомости (вопрос супер-админа / ответ ВС). */
export class CreateInstallerAdvanceSheetItemCommentDto {
  @ApiProperty({ description: 'Текст комментария' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
