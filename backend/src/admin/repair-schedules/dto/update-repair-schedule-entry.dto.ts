import { PartialType } from '@nestjs/swagger';
import { CreateRepairScheduleEntryDto } from './create-repair-schedule-entry.dto';

export class UpdateRepairScheduleEntryDto extends PartialType(CreateRepairScheduleEntryDto) {}
