import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersDirectoryService } from './customers-directory.service';
import { CustomersCrmService } from './customers-crm.service';
import { CustomersController } from './customers.controller';
import { DatabaseModule } from '../../database/database.module';
import { ContractsModule } from '../contracts/contracts.module';

@Module({
  imports: [DatabaseModule, ContractsModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomersDirectoryService, CustomersCrmService],
  exports: [CustomersService],
})
export class CustomersModule {}
