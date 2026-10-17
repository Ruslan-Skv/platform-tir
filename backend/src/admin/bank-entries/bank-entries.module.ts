import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BankEntriesController } from './bank-entries.controller';
import { BankEntriesService } from './bank-entries.service';
import { BankStatementImportService } from './bank-statement-import.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BankEntriesController],
  providers: [BankEntriesService, BankStatementImportService],
  exports: [BankEntriesService],
})
export class BankEntriesModule {}
