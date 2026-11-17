import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRemoteHelpInviteDto {
  @IsString()
  @MaxLength(64)
  userId!: string;
}

export class EndRemoteHelpSessionDto {
  @IsOptional()
  @IsIn(['manual', 'share-stopped', 'disconnect', 'timeout'])
  reason?: string;
}

export class ListRemoteHelpSessionsDto {
  @IsOptional()
  @IsIn(['REQUESTED', 'PENDING', 'ACTIVE', 'ENDED', 'DECLINED', 'CANCELLED', 'EXPIRED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(6)
  limit?: string;
}
