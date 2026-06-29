import { PartialType } from '@nestjs/swagger';
import { CreateCareerVacancyDto } from './careers.dto';

export class UpdateCareerVacancyDto extends PartialType(CreateCareerVacancyDto) {}
