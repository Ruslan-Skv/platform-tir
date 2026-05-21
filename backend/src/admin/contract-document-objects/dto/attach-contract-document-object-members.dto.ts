import { ArrayMinSize, IsArray, IsString, ArrayUnique } from 'class-validator';

export class AttachContractDocumentObjectMembersDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  packageIds: string[];
}
