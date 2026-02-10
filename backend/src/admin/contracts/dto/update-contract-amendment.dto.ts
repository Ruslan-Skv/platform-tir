import { PartialType } from '@nestjs/swagger';
import { CreateContractAmendmentDto } from './create-contract-amendment.dto';

export class UpdateContractAmendmentDto extends PartialType(CreateContractAmendmentDto) {}
