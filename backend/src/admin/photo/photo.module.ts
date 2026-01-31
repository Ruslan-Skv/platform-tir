import { Module } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';
import { PhotoPublicController } from './photo-public.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PhotoController, PhotoPublicController],
  providers: [PhotoService],
  exports: [PhotoService],
})
export class PhotoModule {}
