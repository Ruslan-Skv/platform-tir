import { Module } from '@nestjs/common';
import { HeroService } from './hero.service';
import { HeroController, AdminHeroController } from './hero.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HeroController, AdminHeroController],
  providers: [HeroService],
  exports: [HeroService],
})
export class HeroModule {}
