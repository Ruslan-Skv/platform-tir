import { PartialType } from '@nestjs/mapped-types';
import { CreateComplexObjectDto } from './create-complex-object.dto';

export class UpdateComplexObjectDto extends PartialType(CreateComplexObjectDto) {}
