import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class SignContractDocumentDto {
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otpCode!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  signedName!: string;

  @IsBoolean()
  consent!: boolean;
}

export class RejectContractDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
