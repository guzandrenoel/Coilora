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

  it('/v1/notebooks/:id (DELETE) rejects requests without a token', () => {
    return request(app.getHttpServer())
      .delete('/v1/notebooks/00000000-0000-4000-8000-000000000000')
      .expect(401);
  });

  it('notebook pages reject requests without a token', () => {
    return request(app.getHttpServer())
      .get('/v1/notebooks/00000000-0000-4000-8000-000000000000/pages')
      .expect(401);
  });

  it('notebook page creation rejects invalid tokens', () => {
    return request(app.getHttpServer())
      .post('/v1/notebooks/00000000-0000-4000-8000-000000000000/pages')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .send({ paperStyle: 'ruled' })
      .expect(401);
  });

  it('/v1/courses/:id (DELETE) rejects requests without a token', () => {
    return request(app.getHttpServer())
      .delete('/v1/courses/00000000-0000-4000-8000-000000000000')
      .expect(401);
  });

  it('document creation rejects requests without a token', () => {
    return request(app.getHttpServer())
      .post('/v1/notebooks/00000000-0000-4000-8000-000000000000/documents')
      .send({
        title: 'Test lecture',
        originalFilename: 'lecture.pdf',
        sourceType: 'pdf',
        mediaType: 'application/pdf',
        byteSize: 1024,
      })
      .expect(401);
  });

  it('upload sessions reject requests without a token', () => {
    return request(app.getHttpServer())
      .post('/v1/documents/00000000-0000-4000-8000-000000000000/upload-session')
      .expect(401);
  });

  it('upload sessions reject invalid tokens', () => {
    return request(app.getHttpServer())
      .post('/v1/documents/00000000-0000-4000-8000-000000000000/upload-session')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);
  });

  it('saved documents reject requests without a token', () => {
    return request(app.getHttpServer())
      .get('/v1/notebooks/00000000-0000-4000-8000-000000000000/documents')
      .expect(401);
  });

  it('saved documents reject invalid tokens', () => {
    return request(app.getHttpServer())
      .get('/v1/notebooks/00000000-0000-4000-8000-000000000000/documents')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);
  });

  it('PDF read sessions reject requests without a token', () => {
    return request(app.getHttpServer())
      .post('/v1/documents/00000000-0000-4000-8000-000000000000/read-session')
      .expect(401);
  });

  for (const token of [null, 'Bearer not-a-valid-jwt']) {
    it(`page deletion rejects ${token ? 'invalid' : 'missing'} tokens`, () => {
      const operation = request(app.getHttpServer()).delete(
        '/v1/notebooks/00000000-0000-4000-8000-000000000000/pages/00000000-0000-4000-8000-000000000001',
      );
      if (token) operation.set('Authorization', token);
      return operation.expect(401);
    });
    it(`page restoration rejects ${token ? 'invalid' : 'missing'} tokens`, () => {
      const operation = request(app.getHttpServer()).post(
        '/v1/notebooks/00000000-0000-4000-8000-000000000000/pages/00000000-0000-4000-8000-000000000001/restore',
      );
      if (token) operation.set('Authorization', token);
      return operation.expect(401);
    });
    it(`preview sessions reject ${token ? 'invalid' : 'missing'} tokens`, () => {
      const operation = request(app.getHttpServer()).post(
        '/v1/documents/00000000-0000-4000-8000-000000000000/preview-session',
      );
      if (token) operation.set('Authorization', token);
      return operation.expect(401);
    });
    it(`document bookmarks reject ${token ? 'invalid' : 'missing'} tokens`, () => {
      const operation = request(app.getHttpServer()).patch(
        '/v1/notebooks/00000000-0000-4000-8000-000000000000/documents/00000000-0000-4000-8000-000000000000/bookmark',
      );
      if (token) operation.set('Authorization', token);
      return operation.send({ bookmarked: true }).expect(401);
    });
  }

  it('PDF read sessions reject invalid tokens', () => {
    return request(app.getHttpServer())
      .post('/v1/documents/00000000-0000-4000-8000-000000000000/read-session')
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);
  });

  for (const collection of ['notebooks', 'courses']) {
    for (const token of [null, 'Bearer not-a-valid-jwt']) {
      it(`${collection} updates reject ${token ? 'invalid' : 'missing'} tokens`, () => {
        const operation = request(app.getHttpServer()).patch(
          `/v1/${collection}/00000000-0000-4000-8000-000000000000`,
        );
        if (token) operation.set('Authorization', token);
        return operation
          .send({ title: 'Notes', name: 'Anatomy', coverColor: 'sage' })
          .expect(401);
      });
    }
  }

  afterEach(async () => {
    await app.close();
  });

  it('upload completion rejects requests without a token', () => {
    return request(app.getHttpServer())
      .post(
        '/v1/documents/00000000-0000-4000-8000-000000000000/upload-complete',
      )
      .expect(401);
  });

  it('upload completion rejects invalid tokens', () => {
    return request(app.getHttpServer())
      .post(
        '/v1/documents/00000000-0000-4000-8000-000000000000/upload-complete',
      )
      .set('Authorization', 'Bearer not-a-valid-jwt')
      .expect(401);
  });
});
