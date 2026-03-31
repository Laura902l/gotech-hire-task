import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowed = process.env.ALLOWED_ORIGINS; // comma-separated
  if (process.env.NODE_ENV === 'production') {
    const origins = allowed ? allowed.split(',').map(s => s.trim()) : [];
    app.enableCors({ origin: origins.length ? origins : false });
  } else {
    app.enableCors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', '*'] });
  }

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(3000);
  if (process.env.NODE_ENV !== 'test') {
    Logger.log('Server running on port 3000');
  }
}
bootstrap();
