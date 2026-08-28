# Coilora
<p align="center">
  <img
    src="public/brand/coilora-mark.png"
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

- Responsive Next.js application shell.
- Restrained Coilora visual direction and landing page.
- Library route with local file selection, duplicate prevention, type checks, and size validation.
- Strict TypeScript, ESLint, and production-build checks.
- Product and technical documentation for the web-first MVP.
- Supabase Cloud development environment.
- Versioned PostgreSQL foundation schema with profiles, courses, and notebooks.
- Row Level Security and authenticated ownership policies.
- Typed browser and server Supabase clients.

Planned next:

- Authentication screens and server-side session handling.
- Persistent course and notebook interfaces.
- Private document storage and secure uploads.
- PDF reading and manual annotations.

Detailed scope and sequencing are maintained in the [development roadmap](./docs/coilora/10_DEVELOPMENT_ROADMAP.md).

## Local development

Requirements:

- Node.js 20.9 or newer
- npm 11 or a compatible npm release

Install dependencies and start the development server:

```bash
npm install
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
docs/                 Product and technical documentation
public/brand/         Runtime brand assets
src/app/              Next.js application routes and global styles
src/features/         Feature components and domain helpers
```

Start with the [documentation index](./docs/coilora/README.md) for product scope, architecture, security boundaries, API design, and the implementation roadmap.

## Product boundaries

- Original uploads remain immutable.
- Suggested highlights never modify source documents without approval.
- Source-grounded answers and generated study items preserve citations.
- Authorization is enforced on the server and at the database layer.
- Identifiable patient information is prohibited in the initial release.

Coilora is web-first, not web-only. Native tablet applications are planned after the complete study loop is validated with target students.
