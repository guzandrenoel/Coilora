import type { Database } from '../database/database.types.js';

const formatColumns = [
  'font_family',
  'font_weight',
  'font_style',
  'text_align',
];

export function isMissingAnnotationFormat(
  error: {
    code?: string;
    message?: string;
  } | null,
) {
  return Boolean(
    error &&
    ['42703', 'PGRST204'].includes(error.code ?? '') &&
    formatColumns.some((column) => error.message?.includes(column)),
  );
}

export function legacyAnnotationSelection(selection: string) {
  return selection
    .split(', ')
    .filter((column) => !formatColumns.includes(column))
    .join(', ');
}

export function withLegacyTextFormat<T extends { kind: string }>(item: T) {
  return {
    ...item,
    font_family: item.kind === 'text' ? 'modern' : null,
    font_weight: item.kind === 'text' ? 400 : null,
    font_style: item.kind === 'text' ? 'normal' : null,
    text_align: item.kind === 'text' ? 'left' : null,
  };
}
export type AnnotationRecord = Omit<
  Database['public']['Tables']['annotations']['Row'],
  'owner_id'
>;
export type LegacyAnnotationRecord = Omit<
  AnnotationRecord,
  'font_family' | 'font_weight' | 'font_style' | 'text_align'
>;
