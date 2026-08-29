import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('v1');
    await app.init();
  });

  it('/v1/health (GET)', () => {
    return request(app.getHttpServer()).get('/v1/health').expect(200).expect({
      status: 'ok',
      service: 'coilora-api',
    });
  });

  it('/v1/me (GET) rejects requests without a token', () => {
    return request(app.getHttpServer()).get('/v1/me').expect(401);
  });

  it('/v1/me (GET) rejects invalid tokens', () => {
    return request(app.getHttpServer())
      .get('/v1/me')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);
  });

  it('/v1/courses (GET) rejects requests without a token', () => {
    return request(app.getHttpServer()).get('/v1/courses').expect(401);
  });

  it('/v1/notebooks (POST) rejects requests without a token', () => {
    return request(app.getHttpServer())
      .post('/v1/notebooks')
      .send({ title: 'Cardiovascular system' })
      .expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
