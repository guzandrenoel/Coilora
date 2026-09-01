# Coilora API

The Coilora API is a NestJS application for authenticated server-side operations that should not run directly in the web client.

It is being developed as a modular monolith. The current application provides authenticated course, notebook, blank-page, document upload, saved-document, and PDF read-session operations together with automated tests, strict TypeScript checks, and a production build.

## Local development

From the repository root, start the API in watch mode:

```bash
npm run start:dev --workspace @coilora/api
```

The API uses these local defaults:

```text
API URL: http://localhost:4000
Web origin: http://localhost:3000
```

They can be overridden with:

```env
PORT=4000
WEB_ORIGIN=http://localhost:3000
```

## Current endpoint groups

```text
GET /v1/health
GET /v1/me
GET, POST, PATCH, DELETE /v1/courses
GET, POST, PATCH, DELETE /v1/notebooks
GET, POST /v1/notebooks/:notebookId/pages
GET, POST /v1/notebooks/:notebookId/documents
POST /v1/documents/:documentId/upload-session
POST /v1/documents/:documentId/upload-complete
POST /v1/documents/:documentId/read-session
```

All resource endpoints require a valid Supabase access token and enforce ownership through the API and Row Level Security. The notebook-page API supports blank, dotted, ruled, grid, and Cornell paper styles. Annotation and document-processing endpoints remain planned.

Expected response:

```json
{
  "status": "ok",
  "service": "coilora-api"
}
```

## Quality checks

From the repository root:

```bash
npm run check --workspace @coilora/api
```

This runs linting, TypeScript validation, unit tests, end-to-end tests, and the production build.

The complete monorepo can be checked with:

```bash
npm run check
```

## Architecture

API conventions and security boundaries are documented in:

- [API design](../../docs/coilora/06_API_DESIGN.md)
- [System architecture](../../docs/coilora/04_SYSTEM_ARCHITECTURE.md)
- [Security, authentication, and privacy](../../docs/coilora/08_SECURITY_AUTH_AND_PRIVACY.md)
- [Development roadmap](../../docs/coilora/10_DEVELOPMENT_ROADMAP.md)
