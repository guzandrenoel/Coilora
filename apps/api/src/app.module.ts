import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AnnotationsModule } from './annotations/annotations.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { validateEnvironment } from './config/environment.js';
import { CoursesModule } from './courses/courses.module.js';
import { DatabaseModule } from './database/database.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { MeModule } from './me/me.module.js';
import { NotebooksModule } from './notebooks/notebooks.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    MeModule,
    CoursesModule,
    NotebooksModule,
    DocumentsModule,
    AnnotationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}