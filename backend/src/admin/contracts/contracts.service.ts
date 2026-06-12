import { Injectable } from '@nestjs/common';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreateContractAdvanceDto } from './dto/create-contract-advance.dto';
import { CreateContractAmendmentDto } from './dto/create-contract-amendment.dto';
import { UpdateContractAmendmentDto } from './dto/update-contract-amendment.dto';
import { ContractsCrudService } from './contracts-crud.service';
import { ContractsCustomersService } from './contracts-customers.service';
import { ContractsHistoryService } from './contracts-history.service';
import { ContractsAmendmentsService } from './contracts-amendments.service';

export type { SerializedDocumentCustomer } from './contracts-shared';

@Injectable()
export class ContractsService {
  constructor(
    private crud: ContractsCrudService,
    private customers: ContractsCustomersService,
    private history: ContractsHistoryService,
    private amendments: ContractsAmendmentsService,
  ) {}

  create(createContractDto: CreateContractDto) {
    return this.crud.create(createContractDto);
  }

  findAll(params?: Parameters<ContractsCrudService['findAll']>[0]) {
    return this.crud.findAll(params);
  }

  getCustomersFromContracts(search?: string) {
    return this.customers.getCustomersFromContracts(search);
  }

  findOne(id: string) {
    return this.crud.findOne(id);
  }

  update(id: string, updateContractDto: UpdateContractDto, changedById?: string) {
    return this.crud.update(id, updateContractDto, changedById);
  }

  getHistory(contractId: string) {
    return this.history.getHistory(contractId);
  }

  rollback(contractId: string, historyId: string, userId: string) {
    return this.history.rollback(contractId, historyId, userId);
  }

  remove(id: string) {
    return this.crud.remove(id);
  }

  addAdvance(contractId: string, dto: CreateContractAdvanceDto) {
    return this.amendments.addAdvance(contractId, dto);
  }

  addAmendment(contractId: string, dto: CreateContractAmendmentDto) {
    return this.amendments.addAmendment(contractId, dto);
  }

  removeAdvance(contractId: string, advanceId: string) {
    return this.amendments.removeAdvance(contractId, advanceId);
  }

  removeAmendment(contractId: string, amendmentId: string) {
    return this.amendments.removeAmendment(contractId, amendmentId);
  }

  updateAmendment(contractId: string, amendmentId: string, dto: UpdateContractAmendmentDto) {
    return this.amendments.updateAmendment(contractId, amendmentId, dto);
  }

  uploadActImage(contractId: string, file: Express.Multer.File, type: 'start' | 'end') {
    return this.crud.uploadActImage(contractId, file, type);
  }
}
