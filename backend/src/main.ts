import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import * as express from 'express';
import cookieParser = require('cookie-parser');
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust proxy (nginx) — корректный IP и протокол из X-Forwarded-*
  app.set('trust proxy', 1);

  // Раздача загруженных файлов; резюме — только через API админки
  app.use('/uploads/recruitment', (_req: Request, res: Response) => {
    res.status(403).json({ message: 'Forbidden' });
  });
  app.use(
    '/uploads',
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(join(process.cwd(), 'uploads')),
  );

  // Лимит body: 5MB (защита от DoS); крупные загрузки — через multipart
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ limit: '5mb', extended: true }));
  app.use(cookieParser());

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
