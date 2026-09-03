import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { NotebookPagesService } from './notebook-pages.service.js';
import type { NotebooksService } from './notebooks.service.js';
import { NotebooksController } from './notebooks.controller.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-token',
};
const notebookId = '00000000-0000-4000-8000-000000000002';
const pageId = '00000000-0000-4000-8000-000000000003';

describe('notebook page deletion route inputs', () => {
  for (const [route, operation] of [
    ['deletePage', 'remove'],
    ['restorePage', 'restore'],
  ] as const) {
    it(`${route} forwards only the authenticated user and validated target`, async () => {
      const pages = { [operation]: vi.fn().mockResolvedValue({ id: pageId }) };
      const controller = new NotebooksController(
        {} as NotebooksService,
        pages as unknown as NotebookPagesService,
      );
      await expect(
        controller[route](user, notebookId, pageId),
      ).resolves.toEqual({ id: pageId });
      expect(pages[operation]).toHaveBeenCalledExactlyOnceWith(
        user,
        notebookId,
        pageId,
      );
    });
    it(`${route} rejects malformed notebook and page IDs before accessing data`, () => {
      const pages = { [operation]: vi.fn() };
      const controller = new NotebooksController(
        {} as NotebooksService,
        pages as unknown as NotebookPagesService,
      );
      expect(() => controller[route](user, '../notebook', pageId)).toThrow(
        BadRequestException,
      );
      expect(() => controller[route](user, notebookId, 'invalid-page')).toThrow(
        BadRequestException,
      );
      expect(pages[operation]).not.toHaveBeenCalled();
    });
  }
});
