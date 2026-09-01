import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { DocumentReadController } from './document-read.controller.js';
import { DocumentReadService } from './document-read.service.js';
import { DocumentUploadCompletionService } from './document-upload-completion.service.js';
import { DocumentUploadsController } from './document-uploads.controller.js';
import { DocumentUploadsService } from './document-uploads.service.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  imports: [AuthModule],
  controllers: [
    DocumentsController,
    DocumentUploadsController,
    DocumentReadController,
  ],
  providers: [
    DocumentsService,
    DocumentUploadsService,
    DocumentUploadCompletionService,
    DocumentReadService,
  ],
})
export class DocumentsModule {}