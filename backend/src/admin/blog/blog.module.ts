import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OriginGuard } from '../../common/guards/origin.guard';
import { BlogService } from './blog.service';
import { BlogController } from './blog.controller';
import { BlogPublicController } from './blog-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [BlogController, BlogPublicController],
  providers: [BlogService, OriginGuard],
  exports: [BlogService],
})
export class BlogModule {}
