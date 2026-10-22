import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class ReserveContractNumbersDto {
  @IsString()
  @MaxLength(40)
  packageId: string;

  @IsString()
  @MaxLength(40)
  managerUserId: string;

  @IsString()
  @MaxLength(40)
  surveyorUserId: string;

  @IsString()
  @MaxLength(40)
  officeId: string;

  /** Номера из формы пакета (основной договор + включённые ноги мебели). */
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  numbers: string[];
}
