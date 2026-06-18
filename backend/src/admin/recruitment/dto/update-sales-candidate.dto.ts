import { PartialType } from '@nestjs/swagger';
import { CreateSalesCandidateDto } from './create-sales-candidate.dto';

export class UpdateSalesCandidateDto extends PartialType(CreateSalesCandidateDto) {}
