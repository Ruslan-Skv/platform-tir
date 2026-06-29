import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ContactsAdminController, ContactsPublicController } from './contacts.controller';
import { ContactsService } from './contacts.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContactsPublicController, ContactsAdminController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
