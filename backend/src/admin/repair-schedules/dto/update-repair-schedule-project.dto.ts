import { PartialType } from '@nestjs/swagger';
import { CreateRepairScheduleProjectDto } from './create-repair-schedule-project.dto';

export class UpdateRepairScheduleProjectDto extends PartialType(CreateRepairScheduleProjectDto) {}
