import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';
import type { Environment } from './config/environment.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  const port = config.get('PORT', { infer: true });
  const webOrigin = config.get('WEB_ORIGIN', { infer: true });

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: webOrigin,
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(port);
}

await bootstrap();