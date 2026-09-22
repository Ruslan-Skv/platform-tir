import { Module } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CustomersDirectoryService } from './customers-directory.service';
import { CustomersCrmService } from './customers-crm.service';
import { CustomersDuplicatesService } from './customers-duplicates.service';
import { CustomersController } from './customers.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersDirectoryService,
    CustomersCrmService,
    CustomersDuplicatesService,
  ],
  exports: [CustomersService],
})
export class CustomersModule {}
