import { IsString, MaxLength } from 'class-validator';

export class ReleaseContractNumbersDto {
  @IsString()
  @MaxLength(40)
  packageId: string;
}
