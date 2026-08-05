import { PartialType } from '@nestjs/swagger';
import { CreateFurnitureScheduleEntryDto } from './create-furniture-schedule-entry.dto';

export class UpdateFurnitureScheduleEntryDto extends PartialType(CreateFurnitureScheduleEntryDto) {}
