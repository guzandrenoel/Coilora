import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { NotebooksController } from './notebooks.controller.js';
import { NotebooksService } from './notebooks.service.js';

@Module({
  imports: [AuthModule],
  controllers: [NotebooksController],
  providers: [NotebooksService],
})
export class NotebooksModule {}
