import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import type { HealthStatus } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthStatus {
    return this.appService.getHealth();
  }
}