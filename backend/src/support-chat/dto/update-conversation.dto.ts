import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ConversationStatus } from '@prisma/client';

export class UpdateConversationDto {
  @ApiProperty({ enum: ConversationStatus, required: false })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiProperty({ required: false, description: 'ID агента поддержки для назначения' })
  @IsOptional()
  @IsString()
  assignedToId?: string | null;
}
