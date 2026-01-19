import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum InteractionType {
  CALL = 'CALL',
  EMAIL = 'EMAIL',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
  TASK = 'TASK',
  ORDER = 'ORDER',
}

export class CreateInteractionDto {
  @IsString()
  customerId: string;

  @IsEnum(InteractionType)
  type: InteractionType;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  outcome?: string;
}
