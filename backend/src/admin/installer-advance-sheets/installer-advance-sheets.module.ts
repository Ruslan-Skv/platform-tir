import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { InstallerAdvanceSheetsController } from './installer-advance-sheets.controller';
import { InstallerAdvanceSheetsService } from './installer-advance-sheets.service';

@Module({
  imports: [DatabaseModule],
  controllers: [InstallerAdvanceSheetsController],
  providers: [InstallerAdvanceSheetsService],
})
export class InstallerAdvanceSheetsModule {}
