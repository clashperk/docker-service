import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'development'
        ? ['log', 'error', 'warn', 'verbose', 'fatal', 'debug']
        : ['log', 'error', 'warn', 'verbose', 'fatal'],
  });
  app.useGlobalPipes(new ValidationPipe());
  const logger = new Logger(AppModule.name);

  const port = process.env.PORT || 8080;
  await app.listen(port);

  logger.log(`Auto-Deployment-Service: http://localhost:${port}`);
}
bootstrap();
