import { PartialType } from '@nestjs/swagger';
import { CreateInstallationScheduleDto } from './create-installation-schedule.dto';

export class UpdateInstallationScheduleDto extends PartialType(CreateInstallationScheduleDto) {}
