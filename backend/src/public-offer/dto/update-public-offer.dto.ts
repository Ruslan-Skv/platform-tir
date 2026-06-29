import { PartialType } from '@nestjs/swagger';
import { CreatePublicOfferDto } from './create-public-offer.dto';

export class UpdatePublicOfferDto extends PartialType(CreatePublicOfferDto) {}
