import {
  createCourseSchema,
  coverColorSchema,
  updateNotebookSchema,
  updateCourseSchema,
  createNotebookSchema,
  notebookListQuerySchema,
  createNotebookPageSchema,
  paperStyleSchema,
} from './library.schemas.js';

describe('library schemas', () => {
  it('defaults new courses to sage', () => {
    expect(createCourseSchema.parse({ name: 'Anatomy' }).color).toBe('sage');
  });

  it.each(coverColorSchema.options)(
    'accepts %s for course creation and edits',
    (color) => {
      expect(createCourseSchema.parse({ name: 'Anatomy', color }).color).toBe(
        color,
      );
      expect(updateCourseSchema.parse({ name: 'Anatomy', color }).color).toBe(
        color,
      );
    },
  );

  it.each([null, '', 'brown', '#123456', 1])(
    'rejects invalid course color %s',
    (color) => {
      expect(
        createCourseSchema.safeParse({ name: 'Anatomy', color }).success,
      ).toBe(false);
      expect(
        updateCourseSchema.safeParse({ name: 'Anatomy', color }).success,
      ).toBe(false);
    },
  );

  it('does not default colors on name-only course updates', () => {
    expect(updateCourseSchema.parse({ name: ' Anatomy ' })).toEqual({
      name: 'Anatomy',
    });
  });

  it('rejects course ownership reassignment even with a valid color', () => {
    expect(
      updateCourseSchema.safeParse({
        name: 'Anatomy',
        color: 'rose',
        owner_id: 'other',
      }).success,
    ).toBe(false);
  });
  it('defaults new notebooks to sage', () => {
    expect(createNotebookSchema.parse({ title: 'Notes' }).coverColor).toBe(
      'sage',
    );
  });

  it.each(coverColorSchema.options)(
    'accepts the %s palette for creation and updates',
    (color) => {
      expect(coverColorSchema.parse(color)).toBe(color);
      expect(
        createNotebookSchema.parse({ title: 'Notes', coverColor: color })
          .coverColor,
      ).toBe(color);
      expect(
        updateNotebookSchema.parse({ title: '  Notes  ', coverColor: color })
          .title,
      ).toBe('Notes');
    },
  );

  it.each([null, '', 'brown', '#123456', 1])(
    'rejects invalid color %s',
    (color) => {
      expect(
        createNotebookSchema.safeParse({ title: 'Notes', coverColor: color })
          .success,
      ).toBe(false);
      expect(
        updateNotebookSchema.safeParse({ title: 'Notes', coverColor: color })
          .success,
      ).toBe(false);
    },
  );

  it('rejects incomplete updates and owner or course reassignment', () => {
    for (const body of [
      {},
      { title: 'Notes' },
      { title: ' ', coverColor: 'sage' },
      { title: 'Notes', coverColor: 'sage', owner_id: 'someone-else' },
      { title: 'Notes', coverColor: 'sage', courseId: null },
    ]) {
      expect(updateNotebookSchema.safeParse(body).success).toBe(false);
    }
    expect(
      updateCourseSchema.safeParse({ name: ' ', owner_id: 'other' }).success,
    ).toBe(false);
    expect(updateCourseSchema.parse({ name: '  Anatomy ' })).toEqual({
      name: 'Anatomy',
    });
  });

  it('trims valid course and notebook names', () => {
    expect(createCourseSchema.parse({ name: '  Anatomy  ' }).name).toBe(
      'Anatomy',
    );
    expect(
      createNotebookSchema.parse({ title: '  Cardiovascular system  ' }).title,
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

  it.each(paperStyleSchema.options)(
    'accepts the %s paper style',
    (paperStyle) => {
      expect(
        createNotebookPageSchema.parse({
          title: 'Lecture notes',
          paperStyle,
        }),
      ).toEqual({
        title: 'Lecture notes',
        paperStyle,
        documentId: null,
        afterDocumentPageNumber: null,
      });
    },
  );

  it.each(['lined', 'wide', '', null, 1])(
    'rejects the invalid paper style %s',
    (paperStyle) => {
      expect(createNotebookPageSchema.safeParse({ paperStyle }).success).toBe(
        false,
      );
    },
  );
});
