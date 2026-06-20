import { Module } from '@nestjs/common';
import { SupportChatController } from './support-chat.controller';
import { SupportChatService } from './support-chat.service';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { BellPushModule } from '../bell-push/bell-push.module';

@Module({
  imports: [DatabaseModule, UsersModule, BellPushModule],
  controllers: [SupportChatController],
  providers: [SupportChatService],
  exports: [SupportChatService],
})
export class SupportChatModule {}
