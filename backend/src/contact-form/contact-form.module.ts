import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { ContactFormController, AdminContactFormController } from './contact-form.controller';
import { ContactFormService } from './contact-form.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ContactFormController, AdminContactFormController],
  providers: [ContactFormService],
})
export class ContactFormModule {}
