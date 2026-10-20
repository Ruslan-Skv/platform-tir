import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersLedgerService } from './suppliers-ledger.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersLedgerService],
})
export class SuppliersModule {}
