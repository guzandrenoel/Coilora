type DatabaseError = { code?: string; message?: string } | null;

// Compatibility is limited to the unapplied soft-delete migration. Other
// database failures must never retry a query without its active-page filter.
export function isMissingPageTrashColumn(error: DatabaseError): boolean {
  return Boolean(
    error &&
    (error.code === '42703' || error.code === 'PGRST204') &&
    error.message?.includes('deleted_at') &&
    error.message.includes('notebook_pages'),
  );
}

export const pageTrashUnavailable =
  'Page deletion and restoration are unavailable until the notebook-page soft-delete migration is applied.';
