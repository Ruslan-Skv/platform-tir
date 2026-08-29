import { Injectable } from '@nestjs/common';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { UpdateMeasurementDto } from './dto/update-measurement.dto';
import { MeasurementsCrudService } from './measurements-crud.service';
import { MeasurementsHistoryService } from './measurements-history.service';

@Injectable()
export class MeasurementsService {
  constructor(
    private crud: MeasurementsCrudService,
    private history: MeasurementsHistoryService,
  ) {}

  create(createMeasurementDto: CreateMeasurementDto, createdById?: string) {
    return this.crud.create(createMeasurementDto, createdById);
  }

  findAll(params?: Parameters<MeasurementsCrudService['findAll']>[0]) {
    return this.crud.findAll(params);
  }

  findMy(userId: string, params?: Parameters<MeasurementsCrudService['findMy']>[1]) {
    return this.crud.findMy(userId, params);
  }

  findOne(id: string) {
    return this.crud.findOne(id);
  }

  update(id: string, updateMeasurementDto: UpdateMeasurementDto, changedById?: string) {
    return this.crud.update(id, updateMeasurementDto, changedById);
  }

  getHistory(measurementId: string) {
    return this.history.getHistory(measurementId);
  }

  rollback(measurementId: string, historyId: string, userId: string) {
    return this.history.rollback(measurementId, historyId, userId);
  }

  remove(id: string) {
    return this.crud.remove(id);
  }
}
