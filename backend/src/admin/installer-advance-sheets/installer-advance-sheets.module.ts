import { Module } from '@nestjs/common';

import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { InstallerAdvanceSheetNotifyService } from './installer-advance-sheet-notify.service';
import { InstallerAdvanceSheetsController } from './installer-advance-sheets.controller';
import { InstallerAdvanceSheetsService } from './installer-advance-sheets.service';

@Module({
  imports: [DatabaseModule, BellPushModule],
  controllers: [InstallerAdvanceSheetsController],
  providers: [InstallerAdvanceSheetsService, InstallerAdvanceSheetNotifyService],
})
export class InstallerAdvanceSheetsModule {}
