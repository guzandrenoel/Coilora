import { describe, expect, it } from 'vitest';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  describe('health', () => {
    it('returns the API health status', () => {
      const appService = new AppService();
      const appController = new AppController(appService);

      expect(appController.getHealth()).toEqual({
        status: 'ok',
        service: 'coilora-api',
      });
    });
  });
});