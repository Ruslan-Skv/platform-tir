import { Module } from '@nestjs/common';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SupportChatController],
  providers: [SupportChatService],
  exports: [SupportChatService],
})
export class SupportChatModule {}
