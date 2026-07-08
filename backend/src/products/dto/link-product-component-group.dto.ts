import { IsString } from 'class-validator';

export class LinkProductComponentGroupDto {
  @IsString()
  groupId: string;
}
