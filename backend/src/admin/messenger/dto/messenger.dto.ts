import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDirectConversationDto {
  @IsString()
  userId: string;
}

export class CreateChannelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  memberIds?: string[];
}

export class SendMessengerMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  body: string;
}

export class AddMessengerMembersDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  memberIds: string[];
}
