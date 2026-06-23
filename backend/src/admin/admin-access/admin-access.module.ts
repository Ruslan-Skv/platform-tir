import { Module } from '@nestjs/common';
import { AdminAccessController } from './admin-access.controller';
import { AdminAccessService } from './admin-access.service';
import { AdminResourceInterceptor } from './admin-resource.interceptor';

@Module({
  controllers: [AdminAccessController],
  providers: [AdminAccessService, AdminResourceInterceptor],
  exports: [AdminAccessService, AdminResourceInterceptor],
})
export class AdminAccessModule {}
