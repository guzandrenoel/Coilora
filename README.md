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

Coilora is a source-grounded study workspace for medical and allied-health students. It is being built around one continuous learning loop:

**Import → Annotate → Highlight → Understand → Practice → Review**

The project is in active development. Authentication, course and notebook organization, private document uploads, saved-document listing, PDF reading, and persistent blank notebook pages are implemented. Opening and editing blank pages, PDF annotations, document processing, and AI-assisted study features are planned.

## Current state

### Accounts and workspace

- Responsive Next.js landing page and library workspace.
- Branded interface with navigation icons, motion, and responsive layouts.
- Email and password authentication, email confirmation, and password recovery.
- Session refresh, protected library access, and sign-out.
- Automatic profile creation after registration.
- Persistent course and notebook creation and listing.
- Optional course assignment when creating notebooks.
- Persisted course accent colors and notebook cover colors, including yellow.
- Course and notebook archiving.
- Course archiving is blocked while the course contains active notebooks.
- Course-scoped notebook views and a responsive notebook workspace.
- Persistent blank notebook pages with blank, dotted, ruled, grid, and Cornell paper styles.

### Documents and uploads

- File selection and drag-and-drop.
- Duplicate selection prevention within the current upload queue.
- Browser-side filename, file-type, and size checks.
- PDF, PNG, JPG/JPEG, WEBP, TXT, and Markdown support.
- A maximum file size of 50 MiB (52,428,800 bytes), displayed as 50 MB in the interface.
- Document metadata stored in PostgreSQL and associated with a notebook.
- Private Supabase Storage with ownership policies.
- Authenticated upload-session creation and signed file uploads.
- Per-file transfer percentages and progress bars.
- Server-side upload completion checks for file presence, expected size, and stored content type.
- Retry controls for failed upload stages.
- Saved-document lists with loading, empty, error, recovery, and pagination states.
- Automatic saved-list refresh after successful uploads.
- Authenticated PDF read sessions backed by short-lived signed URLs.
- An in-app PDF reader with page navigation and fit/zoom controls.
- PDF rendering that keeps original uploads unchanged.

### Backend and development foundation

- Separate Next.js web and NestJS API workspaces.
- Supabase access-token verification through JWKS.
- Protected API routes and a current-user identity endpoint.
- User-scoped database clients and Row Level Security policies.
- Versioned database migrations for profiles, courses, notebooks, notebook pages, and documents.
- Row Level Security policies for user-owned notebook pages and private documents.
- Generated database types shared across the API and web applications.
- TypeScript, linting, API unit tests, API HTTP tests, and production-build checks.
- Product, architecture, security, and delivery documentation.

## Upload behavior

1. Create or select a notebook.
2. Choose study materials.
3. Select the destination under **Save to notebook**.
4. Click **Upload**.
5. Watch the transfer progress and verification status.
6. Find completed uploads under **Saved documents**.

The upload queue and saved-document list serve different purposes:

- The upload queue is temporary and resets when the page reloads.
- **Remove** and **Clear list** only remove entries from that queue. They do not delete saved files.
- Saved documents are loaded from the API and remain available after a reload.
- Select the notebook again after reloading to view its documents.
- Uploads run sequentially. Keep the page open until they finish.
- Retry controls are available while the current queue remains open. Uploads are not resumable across page reloads.

**Uploaded means saved to storage, not processed for studying.**

The completion endpoint checks storage metadata. It does not yet inspect document contents, scan for malware, extract text, perform OCR, or build a search index. Waiting will not start those unimplemented processing stages.

## Planned next

- A dedicated editor route for opening persistent blank notebook pages.
- A reusable annotation layer for blank pages and PDF pages.
- Drawing, highlighting, erasing, and undo/redo with durable annotation storage.
- Lazy PDF page thumbnails so large documents remain responsive.
- Document-content validation and background processing.
- Text extraction, OCR, and search indexing.
- Source-grounded explanations with citations.
- Study-item generation, practice, and review.
- Native tablet support after validation of the web study workflow.

The [development roadmap](./docs/coilora/10_DEVELOPMENT_ROADMAP.md) describes the intended scope and sequencing. Roadmap features should not be assumed to be implemented.

## Local development

The current development environment uses:

- Node.js 24.x
- npm 11.19.0
- A Supabase development project

Run the following commands from the repository root using Git Bash or another Bash-compatible terminal.

### Install dependencies

```bash
npm install
```

### Configure the web application

Create the local environment file if it does not already exist:

```bash
cp -n apps/web/.env.example apps/web/.env.local
```

Set these values in `apps/web/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

### Configure the API

Create the local environment file if it does not already exist:

```bash
cp -n apps/api/.env.example apps/api/.env
```

Set these values in `apps/api/.env`:

```env
PORT=4000
WEB_ORIGIN=http://localhost:3000
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_JWT_AUDIENCE=authenticated
```

Replace `YOUR_PROJECT_REF` and `YOUR_PUBLISHABLE_KEY` with values from the same Supabase development project.

The localhost addresses, port, and `authenticated` audience can remain as shown for the default local setup.

Never commit local environment files, database passwords, service-role keys, or signed upload tokens. The current application uses a publishable key together with the authenticated user's access token for user-scoped database operations.

### Prepare Supabase

For a new development environment, authenticate the Supabase CLI and link the intended project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Review pending migrations before applying them:

```bash
npx supabase db push --dry-run
```

After confirming the target project and pending migrations:

```bash
npx supabase db push
```

This command changes the linked remote database. Do not apply migrations to an unintended project.

The committed migrations create the application tables, ownership policies, and private `documents` storage bucket. Keep this bucket private.

For an existing environment, let the CLI track applied migrations. Do not manually rerun or rewrite an already-applied migration.

Configure Supabase Auth for the local application URL and its confirmation and recovery callback URLs. The application uses `/auth/callback` to exchange authentication codes.

### Start both applications

Start the web application:

```bash
npm run dev
```

In a second terminal, start the API:

```bash
npm run start:dev --workspace @coilora/api
```

Local services:

- Web application: [http://localhost:3000](http://localhost:3000)
- API health check: [http://localhost:4000/v1/health](http://localhost:4000/v1/health)

The root `dev` command starts only the web application. Keep the API running for course, notebook, identity, and document operations.

## Quality checks

Run individual checks from the repository root:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Run the complete suite:

```bash
npm run check
```

Run checks for one workspace:

```bash
npm run check --workspace @coilora/api
npm run check --workspace @coilora/web
```

Current automated tests cover API schemas, service behavior, notebook-page persistence, document reading, authentication rejection on selected routes, and selected web library behavior.

Real upload progress and saved-document display have also been checked manually during development. Automated checks are not a substitute for browser testing or verification of deployed authorization policies.

## Repository structure

```text
apps/
  api/
    src/auth/             Access-token verification and authentication guards
    src/config/           Environment validation
    src/courses/          Course operations
    src/database/         User-scoped clients and generated database types
    src/documents/        Document metadata and upload services
    src/notebooks/        Notebook and blank-page operations
    test/                 API HTTP tests and test configuration

  web/
    public/brand/         Runtime brand assets
    src/app/              Routes, authentication screens, and layouts
    src/components/       Shared interface components and icons
    src/features/         Library, upload, and saved-document interfaces
    src/lib/api/          Authenticated browser-to-API clients
    src/lib/supabase/     Browser, server, and session Supabase clients
    src/types/            Generated database types

docs/                     Product and technical documentation
supabase/                 Supabase configuration and database migrations
```

The repository uses npm workspaces. The web application and API run as separate applications.

A background worker is planned for document processing. It is not implemented yet.

Start with the [documentation index](./docs/coilora/README.md) for product scope, architecture, security boundaries, API design, and the implementation roadmap.

## Product boundaries

- The upload workflow stores original file contents without rewriting them and does not overwrite existing objects.
- Application authorization is enforced through authenticated API routes and database and storage policies.
- Identifiable patient information is prohibited in the initial release.
- Document processing and content-safety checks remain incomplete.
- Planned annotation tools must preserve source documents.
- Planned explanations and generated study items must preserve citations.
- Suggested changes to study material must remain under the user's control.

Coilora is web-first, not web-only. Native tablet applications and stylus-focused workflows are planned after the complete study loop is validated with target students.
