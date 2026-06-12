import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OriginGuard } from '../../common/guards/origin.guard';
import { BlogService } from './blog.service';
import { BlogPostsAdminService } from './blog-posts-admin.service';
import { BlogCategoriesService } from './blog-categories.service';
import { BlogPublicService } from './blog-public.service';
import { BlogController } from './blog.controller';
import { BlogPublicController } from './blog-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [BlogController, BlogPublicController],
  providers: [
    BlogService,
    BlogPostsAdminService,
    BlogCategoriesService,
    BlogPublicService,
    OriginGuard,
  ],
  exports: [BlogService],
})
export class BlogModule {}
