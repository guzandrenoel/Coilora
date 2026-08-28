import { Injectable } from '@nestjs/common';

export type HealthStatus = {
  status: 'ok';
  service: 'coilora-api';
};

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'coilora-api',
    };
  }
}