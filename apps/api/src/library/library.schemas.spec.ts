import {
  createCourseSchema,
  createNotebookSchema,
  notebookListQuerySchema,
} from './library.schemas.js';

describe('library schemas', () => {
  it('trims valid course and notebook names', () => {
    expect(createCourseSchema.parse({ name: '  Anatomy  ' }).name).toBe(
      'Anatomy',
    );
    expect(
      createNotebookSchema.parse({ title: '  Cardiovascular system  ' })
        .title,
    ).toBe('Cardiovascular system');
  });

  it('rejects blank names and invalid course identifiers', () => {
    expect(createCourseSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(
      createNotebookSchema.safeParse({
        title: 'Lecture notes',
        courseId: 'not-a-uuid',
      }).success,
    ).toBe(false);
    expect(
      notebookListQuerySchema.safeParse({ courseId: 'not-a-uuid' }).success,
    ).toBe(false);
  });
});
