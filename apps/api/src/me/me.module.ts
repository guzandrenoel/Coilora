import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeController } from './me.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [MeController],
})
export class MeModule {}