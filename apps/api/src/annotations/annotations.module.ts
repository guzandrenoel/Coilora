import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { NotebooksModule } from '../notebooks/notebooks.module.js';
import { NotebookPageAnnotationsController } from './notebook-page-annotations.controller.js';
import { NotebookPageAnnotationsService } from './notebook-page-annotations.service.js';
import { DocumentPageAnnotationsController } from './document-page-annotations.controller.js';
import { DocumentPageAnnotationsService } from './document-page-annotations.service.js';

@Module({
  imports: [AuthModule, NotebooksModule],
  controllers: [
    NotebookPageAnnotationsController,
    DocumentPageAnnotationsController,
  ],
  providers: [NotebookPageAnnotationsService, DocumentPageAnnotationsService],
})
export class AnnotationsModule {}
