import { PartialType } from '@nestjs/swagger';
import { CreateCrmDirectionDto } from './create-crm-direction.dto';

export class UpdateCrmDirectionDto extends PartialType(CreateCrmDirectionDto) {}
