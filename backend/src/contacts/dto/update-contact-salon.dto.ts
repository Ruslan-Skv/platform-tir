import { PartialType } from '@nestjs/swagger';
import { CreateContactSalonDto } from './contacts.dto';

export class UpdateContactSalonDto extends PartialType(CreateContactSalonDto) {}
