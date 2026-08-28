# Coilora
<p align="center">
  <img
    src="apps/web/public/brand/coilora-mark.png"
    alt="Coilora logo"
    width="180"
  />
</p>

<p align="center">
  <em>Shed the overload. Keep what matters.</em>
</p>

Coilora is a source-grounded study workspace for medical and allied-health students. It is designed around one continuous learning loop:

**Import → Annotate → Highlight → Understand → Practice → Review**

The project is currently in its foundation phase. This repository contains the initial web application shell and the product, architecture, security, and delivery documentation that will guide implementation.

## Current state

Implemented:

- Responsive Next.js application shell and product landing page.
- Interactive preview of the Import → Annotate → Highlight → Understand → Practice → Review workflow.
- Email and password authentication with email confirmation.
- Server-side session refresh, protected library access, and sign-out.
- Automatic user profile creation after registration.
- Responsive library workspace with local file selection, duplicate prevention, type checks, and size validation.
- Supabase Cloud development environment.
- Versioned PostgreSQL foundation schema with profiles, courses, and notebooks.
- Row Level Security and authenticated ownership policies.
- Typed browser and server Supabase clients.
- Strict TypeScript, ESLint, and production-build checks.
- Product and technical documentation for the web-first MVP.

Planned next:

- Persistent course and notebook interfaces.
- Private document storage and secure uploads.
- PDF reading and manual annotations.
- Source-grounded explanations and study-item generation.

Detailed scope and sequencing are maintained in the [development roadmap](./docs/coilora/10_DEVELOPMENT_ROADMAP.md).

## Local development

Requirements:

- Node.js 20.9 or newer
- npm 11 or a compatible npm release

Install dependencies:

```bash
npm install
```

Create the local environment file:

```bash
cp apps/web/.env.example apps/web/.env.local
```

Provide the following values in `apps/web/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

The Supabase URL and publishable key are available from the Supabase project dashboard. Never commit `apps/web/.env.local`.

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

Run all three checks together with:

```bash
npm run check
```

## Repository structure

```text
apps/web/                 Next.js frontend application
  public/brand/           Runtime brand assets
  src/app/                Routes, authentication screens, and styles
  src/features/           Feature and interactive interface components
  src/lib/supabase/       Browser, server, and session Supabase clients
  src/types/              Generated database types
docs/                     Product and technical documentation
supabase/                 Supabase configuration and database migrations
```

The repository uses npm workspaces. The planned NestJS API and worker will be added as
`apps/api` and `apps/worker` when their implementation begins; empty application scaffolding
is intentionally avoided.

Start with the [documentation index](./docs/coilora/README.md) for product scope, architecture, security boundaries, API design, and the implementation roadmap.

## Product boundaries

- Original uploads remain immutable.
- Suggested highlights never modify source documents without approval.
- Source-grounded answers and generated study items preserve citations.
- Authorization is enforced on the server and at the database layer.
- Identifiable patient information is prohibited in the initial release.

Coilora is web-first, not web-only. Native tablet applications are planned after the complete study loop is validated with target students.
