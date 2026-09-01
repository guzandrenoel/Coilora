import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { CoursesService } from '../courses/courses.service.js';
import { NotebooksService } from '../notebooks/notebooks.service.js';
import { createCourseSchema } from './library.schemas.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-token',
};
const id = '00000000-0000-4000-8000-000000000002';
function setup(
  data: unknown = { id, title: 'Notes', cover_color: 'ocean' },
  error: unknown = null,
) {
  const query = {
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
  const client = { from: vi.fn().mockReturnValue(query) };
  const clients = { create: vi.fn().mockReturnValue(client) };
  const factory = clients as unknown as UserDatabaseClientFactory;
  return {
    query,
    client,
    clients,
    notebooks: new NotebooksService(factory),
    courses: new CoursesService(factory),
  };
}

describe('library updates', () => {
  it('lists active courses with their saved colors', async () => {
    const rows = [{ id, name: 'Anatomy', accent_color: 'ocean' }];
    const { courses, clients, client, query } = setup(rows);
    await expect(courses.list(user)).resolves.toEqual({ items: rows });
    expect(clients.create).toHaveBeenCalledWith(user);
    expect(client.from).toHaveBeenCalledWith('courses');
    expect(query.is).toHaveBeenCalledWith('archived_at', null);
    expect(query.select.mock.calls[0]?.[0]).toContain('accent_color');
  });
  it.each(['rose', 'yellow'] as const)(
    'creates a course with %s and the authenticated owner',
    async (color) => {
      const row = { id, name: 'Biochemistry', accent_color: color };
      const { courses, clients, client, query } = setup(row);
      await expect(
        courses.create(user, {
          name: 'Biochemistry',
          color,
          description: null,
        }),
      ).resolves.toEqual(row);
      expect(clients.create).toHaveBeenCalledWith(user);
      expect(client.from).toHaveBeenCalledWith('courses');
      expect(query.insert).toHaveBeenCalledWith({
        owner_id: user.id,
        name: 'Biochemistry',
        accent_color: color,
        description: null,
      });
      expect(query.select.mock.calls[0]?.[0]).toContain('accent_color');
    },
  );
  it('persists sage when course creation omits a color', async () => {
    const { courses, query } = setup();
    await courses.create(user, createCourseSchema.parse({ name: 'Anatomy' }));
    expect(query.insert).toHaveBeenCalledWith({
      owner_id: user.id,
      name: 'Anatomy',
      accent_color: 'sage',
      description: null,
    });
  });
  it.each(['lavender', 'yellow'] as const)(
    'updates course color to %s without changing ownership or notebook covers',
    async (color) => {
      const row = { id, name: 'Anatomy', accent_color: color };
      const { courses, query, clients, client } = setup(row);
      await expect(
        courses.update(user, id, {
          name: 'Anatomy',
          color,
        }),
      ).resolves.toEqual(row);
      expect(clients.create).toHaveBeenCalledWith(user);
      expect(client.from).toHaveBeenCalledExactlyOnceWith('courses');
      expect(query.update).toHaveBeenCalledWith({
        name: 'Anatomy',
        accent_color: color,
      });
      expect(query.eq).toHaveBeenCalledWith('id', id);
      expect(query.eq).toHaveBeenCalledWith('owner_id', user.id);
      expect(query.is).toHaveBeenCalledWith('archived_at', null);
      expect(query.select.mock.calls[0]?.[0]).toContain('accent_color');
    },
  );
  it('saves notebook title and color without changing ownership, course, or description', async () => {
    const { notebooks, query, clients, client } = setup();
    await expect(
      notebooks.update(user, id, { title: 'Notes', coverColor: 'ocean' }),
    ).resolves.toMatchObject({ id, cover_color: 'ocean' });
    expect(clients.create).toHaveBeenCalledWith(user);
    expect(client.from).toHaveBeenCalledWith('notebooks');
    expect(query.update).toHaveBeenCalledWith({
      title: 'Notes',
      cover_color: 'ocean',
    });
    expect(query.eq).toHaveBeenCalledWith('id', id);
    expect(query.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(query.is).toHaveBeenCalledWith('archived_at', null);
    expect(query.select.mock.calls[0]?.[0]).toContain('cover_color');
  });
  it('saves a course name through the authenticated owner-scoped client', async () => {
    const { courses, clients, query } = setup({ id, name: 'Anatomy' });
    await expect(
      courses.update(user, id, { name: 'Anatomy' }),
    ).resolves.toEqual({ id, name: 'Anatomy' });
    expect(clients.create).toHaveBeenCalledWith(user);
    expect(query.update).toHaveBeenCalledWith({ name: 'Anatomy' });
    expect(query.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(query.eq).toHaveBeenCalledWith('id', id);
    expect(query.is).toHaveBeenCalledWith('archived_at', null);
  });
  it.each(['rose', 'yellow'] as const)(
    'persists the %s cover on creation',
    async (color) => {
      const { notebooks, query } = setup();
      await notebooks.create(user, {
        title: 'Notes',
        coverColor: color,
        courseId: null,
        description: null,
      });
      expect(query.insert).toHaveBeenCalledWith({
        owner_id: user.id,
        title: 'Notes',
        cover_color: color,
        course_id: null,
        description: null,
      });
    },
  );
  it.each(['notebook', 'course'])(
    'returns not found for missing, archived, or inaccessible %s',
    async (kind) => {
      const { notebooks, courses } = setup(null);
      const action =
        kind === 'notebook'
          ? notebooks.update(user, id, { title: 'Notes', coverColor: 'sage' })
          : courses.update(user, id, { name: 'Anatomy' });
      await expect(action).rejects.toBeInstanceOf(NotFoundException);
    },
  );
  it.each(['notebook', 'course'])(
    'reports database failure instead of a successful %s save',
    async (kind) => {
      const { notebooks, courses } = setup(null, { code: '08006' });
      const action =
        kind === 'notebook'
          ? notebooks.update(user, id, { title: 'Notes', coverColor: 'sage' })
          : courses.update(user, id, { name: 'Anatomy' });
      await expect(action).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );
  it('reports duplicate course names', async () => {
    const { courses } = setup(null, { code: '23505' });
    await expect(
      courses.update(user, id, { name: 'Anatomy' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
