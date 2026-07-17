import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { Logger } from 'nestjs-pino';
import { join } from 'node:path';

import { AppModule } from './app.module';
import { initSentry } from './infrastructure/sentry/sentry';

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  const fastify = app.getHttpAdapter().getInstance();
  await fastify.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
  });

  const uploadsRoot = join(process.cwd(), 'uploads');
  const useObjectStorage = Boolean(
    process.env.S3_BUCKET?.trim() &&
    process.env.S3_ENDPOINT?.trim() &&
    process.env.AWS_ACCESS_KEY_ID?.trim() &&
    process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
  if (!useObjectStorage) {
    await fastify.register(fastifyStatic, {
      root: uploadsRoot,
      prefix: '/assets/files/',
      decorateReply: false,
    });
  }

  app.useLogger(app.get(Logger));
  app.enableCors({
    origin: [
      process.env.APP_URL ?? 'http://localhost:5173',
      process.env.ADMIN_APP_URL ?? 'http://localhost:5174',
    ],
    credentials: true,
    // Fastify/Nest default allow-list is GET/HEAD/POST — browsers block PATCH preflight otherwise
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/docs', 'api/docs-json'],
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CardWise API')
      .setDescription('CardWise Financial Decision Intelligence Platform API')
      .setVersion('0.0.0')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`API listening on http://localhost:${port}`);
  if (!isProd) {
    logger.log(`Swagger UI at http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
