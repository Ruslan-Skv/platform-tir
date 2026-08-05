import { PartialType } from '@nestjs/swagger';
import { CreateFurnitureScheduleProjectDto } from './create-furniture-schedule-project.dto';

export class UpdateFurnitureScheduleProjectDto extends PartialType(
  CreateFurnitureScheduleProjectDto,
) {}
