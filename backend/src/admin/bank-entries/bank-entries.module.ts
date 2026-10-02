import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { BankEntriesController } from './bank-entries.controller';
import { BankEntriesService } from './bank-entries.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BankEntriesController],
  providers: [BankEntriesService],
  exports: [BankEntriesService],
})
export class BankEntriesModule {}
