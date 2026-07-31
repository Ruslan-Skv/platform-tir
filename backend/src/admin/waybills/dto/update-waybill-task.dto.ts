import { PartialType } from '@nestjs/swagger';
import { CreateWaybillTaskDto } from './create-waybill-task.dto';

export class UpdateWaybillTaskDto extends PartialType(CreateWaybillTaskDto) {}
