import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { BellPushModule } from '../../bell-push/bell-push.module';
import { DatabaseModule } from '../../database/database.module';
import { ExternalNotifyModule } from '../../external-notify/external-notify.module';
import { UsersModule } from '../../users/users.module';
import { RemoteHelpController } from './remote-help.controller';
import { RemoteHelpGateway } from './remote-help.gateway';
import { RemoteHelpService } from './remote-help.service';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    BellPushModule,
    ExternalNotifyModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [RemoteHelpController],
  providers: [RemoteHelpService, RemoteHelpGateway],
  exports: [RemoteHelpService],
})
export class RemoteHelpModule {}
