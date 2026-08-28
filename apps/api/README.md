# Coilora API

The Coilora API is a NestJS application for authenticated server-side operations that should not run directly in the web client.

It is being developed as a modular monolith. The initial foundation provides a versioned health endpoint, automated tests, strict TypeScript checks, and a production build.

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

## Current endpoint

```text
GET /v1/health
```

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
