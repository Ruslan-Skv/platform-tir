import { ArrayUnique, IsArray, IsString } from 'class-validator';

export class UpdateUserCrmDirectionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  directionIds!: string[];
}
