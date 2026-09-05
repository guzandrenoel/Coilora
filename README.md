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

Coilora is a source-grounded study workspace for medical and allied-health students. It brings lecture PDFs, personal notes, and annotations into one connected notebook.

The intended learning loop is:

**Import → Annotate → Highlight → Understand → Practice → Review**

The project is in active development. Authentication, notebook organization, private uploads, document previews, continuous notebook reading, freehand annotations, and bookmarks are implemented. Document processing and smart study features remain planned.

## Current features

### Accounts and organization

- Responsive Next.js landing page and library workspace.
- Email and password authentication, email confirmation, and password recovery.
- Session refresh, protected library access, and sign-out.
- Automatic profile creation after registration.
- Persistent course and notebook creation and listing.
- Optional course assignment when creating notebooks.
- Persisted course accent colors and notebook cover colors.
- Course-scoped notebook views.
- Course and notebook archiving.
- Course archiving is blocked while the course contains active notebooks.

### Connected notebook viewer

- One continuous reading area for standalone notes, PDF pages, and notes inserted between PDF pages.
- Opening a note or PDF keeps the rest of its notebook accessible.
- Shared thumbnail sidebar with annotation previews and collapsible document groups.
- A notebook-home icon and adjacent page-panel control anchor the viewer toolbar.
- An icon-only bookmark filter at the right of the page-panel controls shows bookmarked pages and files.
- Previous/next navigation and direct jumps from page previews.
- Fit-page, fit-width, and fixed zoom controls.
- The notebook-home button returns to the containing notebook.
- Responsive sidebar behavior for desktop and smaller screens.

Standalone notes appear first in their saved order, followed by documents in import order. Notes attached to a PDF appear at their saved source-page positions.

Collapsing a document group hides its sidebar thumbnails, not its pages in the continuous reading area.

### Notes and annotations

- Persistent named notebook pages.
- Blank, dotted, ruled, grid, and Cornell paper styles.
- Page creation and renaming from the viewer.
- Confirmed soft deletion from the three-dot menus in the viewer and notebook overview (requires the page soft-delete migration).
- Authenticated delete/restore requests with owner checks. Deleted pages are excluded from normal page lists and cannot be edited through the API.
- Notes can be placed before the first PDF page or after a selected PDF page.
- Freehand pen, highlighter, and eraser tools for note pages and PDFs.
- Select and drag saved strokes while keeping them within page boundaries.
- Undo and redo the latest 100 annotation creates, moves, and erases from the current viewer session, including standard keyboard shortcuts.
- Selectable ink colors.
- The select tool is the neutral default, scrolling on empty page space and moving saved strokes when dragged.
- Accessible control labels, selected states, and tooltips.
- Original PDFs remain unchanged; annotations are stored separately.

Completed strokes remain visible while saving. Active, pending, and failed strokes stay mounted when their pages scroll out of view.

Failed saves retain the stroke and provide a retry action. Retries reuse a stable stroke ID to avoid duplicate ink after a lost response.

Pending strokes are held in memory, not in an offline outbox. Keep the viewer open and retry failed saves before leaving. The app's back buttons block navigation while ink is pending, and closing or reloading the browser page requests an unsaved-work warning. Browser-history navigation is not an offline recovery mechanism.

Deleting a note preserves its content, source position, annotations, and bookmarks. It does not remove an imported document or PDF page. The viewer blocks deletion while that page has active or unsaved ink, then selects a remaining page if necessary. Deleting the last page of an otherwise empty notebook returns to the notebook overview. Restoration currently has an API endpoint and client helper; a Trash/Restore interface is not implemented yet.

The `20260903110334_add_notebook_page_soft_delete.sql` migration adds the soft-delete column and database protections. In environments where it has not been applied, existing page reads and renaming remain compatible, while delete/restore return an explicit unavailable error without removing anything. Code commits and Git pushes do not apply database migrations. The API/web type snapshots include the soft-delete column.

### Bookmarks

- Bookmark individual notebook pages.
- Bookmark individual PDF pages.
- Bookmark entire documents from their tiles or sidebar groups.
- Filter the shared sidebar to bookmarked content.
- Bookmark state persists through the API and database.
- PDF bookmark lists are retrieved in batches to avoid truncation at the database's default row limit.

Whole-document bookmarks and individual page bookmarks are independent.

### Documents and uploads

- File selection and drag-and-drop.
- Duplicate selection prevention within the current upload queue.
- Browser-side filename, file-type, and size checks.
- Support for PDF, PNG, JPG/JPEG, WEBP, TXT, and Markdown uploads.
- Maximum file size of 50 MiB (52,428,800 bytes), displayed as 50 MB in the interface.
- Document metadata associated with a notebook.
- Private Supabase Storage with ownership policies.
- Authenticated upload-session creation and signed file uploads.
- Per-file transfer percentages and progress bars.
- Server-side completion checks for file presence, expected size, and stored content type.
- Retry controls for failed upload stages.
- Automatic saved-document refresh after successful uploads.

Saved documents use compact tiles with actual first-page PDF previews, image previews, or plain-text previews for TXT/Markdown. Clicking a PDF preview or title opens it directly in its notebook, without separate file-details or reader buttons.

Continuous reading currently supports PDFs and notebook pages. Other supported file formats retain their library previews.

### Large-document handling

- Main pages and sidebar thumbnail grids are virtualized.
- Only nearby pages render, except pages retained for active or unsaved ink.
- The viewer caches at most two PDF sources at a time.
- Each rendered page canvas is limited to four million pixels.
- Library previews load near the viewport, with at most two source downloads/renderers running concurrently.
- PDF reading supports documents containing up to 5,000 pages.

These limits avoid creating a full-size canvas for every page in a large notebook. They do not eliminate download or rendering costs: large files and complex PDF pages can still take time to open.

### Backend and development foundation

- Separate Next.js web and NestJS API workspaces.
- Supabase access-token verification through JWKS.
- Protected API routes and a current-user identity endpoint.
- User-scoped database clients.
- Row Level Security policies for notebooks, pages, annotations, bookmarks, and documents.
- Versioned database migrations.
- Generated database types used by the API and web applications.
- TypeScript, linting, unit tests, API HTTP tests, and production-build checks.
- Product, architecture, security, and delivery documentation.

## Upload behavior

1. Create or select a notebook.
2. Choose study materials.
3. Select the destination under **Save to notebook**.
4. Click **Upload**.
5. Watch transfer progress and verification status.
6. Find completed uploads in the notebook's documents section.

The upload queue and saved documents serve different purposes:

- The upload queue is temporary and resets when the page reloads.
- **Remove** and **Clear list** remove queue entries only. They do not delete saved files.
- Saved documents are loaded from the API and remain available after a reload.
- Uploads run sequentially. Keep the page open until they finish.
- Failed uploads can be retried while their queue entries remain available.
- Uploads are not resumable across page reloads.

**Uploaded means saved to storage, not processed for studying.**

The completion endpoint checks storage metadata. It does not yet inspect document contents, scan for malware, extract text, perform OCR, or build a search index. Waiting will not start those unimplemented processing stages.

## Planned work

The following features are not yet implemented.

### Editing and document processing

- Page reordering and a Trash/Restore interface.
- Typed page notes and text-selection highlights.
- PDF search and citation navigation.
- Document-content validation and background processing.
- Text extraction, OCR, and search indexing.

### Smart study features

- Source-grounded questions and explanations with clickable citations.
- Clear insufficient-evidence responses when uploaded sources do not support an answer.
- Suggested highlights presented for acceptance, rejection, or adjustment.
- Editable flashcards and practice questions linked to their source pages.
- Image-occlusion study items.
- Review queues, spaced-repetition scheduling, and weak-topic tracking.

Smart features are intended to help students work with their own materials. Suggestions must remain reviewable, generated study items must retain source references, and original documents must not be overwritten.

### Platform expansion

- Native tablet applications and stylus-focused workflows.
- Offline capabilities after the web study workflow is validated.

The [development roadmap](./docs/coilora/10_DEVELOPMENT_ROADMAP.md) describes the intended scope and sequencing. Roadmap features should not be assumed to be available.

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

Never commit local environment files, database passwords, service-role keys, access tokens, or signed upload credentials. The application uses a publishable key together with the authenticated user's access token for user-scoped database operations.

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

The repository's migrations create the application tables, ownership policies, and private `documents` storage bucket. Keep this bucket private.

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

The root `dev` command starts only the web application. Keep the API running for course, notebook, document, annotation, and bookmark operations.

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

Automated coverage includes:

- API schemas and service behavior.
- Notebook-page persistence and document reading.
- Page delete/restore ownership filters, repeat requests, active-page edit guards, and pre-migration compatibility.
- Remaining-page selection after deleting a note from the continuous viewer.
- Owner- and target-scoped annotation retries.
- Authentication rejection on selected API routes.
- Long PDF bookmark lists.
- Library filtering and sorting.
- Annotation coordinate calculations.
- Mixed note/PDF ordering and insertion positions.
- Scroll anchoring and fit-layout calculations.
- A simulated 5,000-page virtualized timeline.
- Bounded PDF resource acquisition, cancellation, eviction, and cleanup.

Automated checks are not a substitute for browser testing with real documents or verification of deployed authorization policies. Passing the timeline tests does not guarantee identical performance across devices or PDF files.

After applying the soft-delete migration to the intended development project, run its database regression checks with:

```bash
npx supabase db query --linked --file supabase/tests/notebook_page_soft_delete.sql
```

This requires a CLI version with `db query`. It creates synthetic users and content inside a transaction, checks deletion, restoration, owner isolation, and retained annotations/bookmarks as the authenticated database role, then rolls back the fixtures. It does not read or modify existing pages.

## Repository structure

```text
apps/
  api/
    src/annotations/      Notebook/PDF annotations and PDF page bookmarks
    src/auth/             Access-token verification and authentication guards
    src/config/           Environment validation
    src/courses/          Course operations
    src/database/         User-scoped clients and generated database types
    src/documents/        Document metadata, upload, read, and preview services
    src/notebooks/        Notebook and note-page operations
    test/                 API HTTP tests and test configuration

  web/
    public/brand/         Runtime brand assets
    src/app/              Routes, authentication screens, and layouts
    src/components/       Shared interface components and icons
    src/features/editor/  Annotation canvas and editor controls
    src/features/library/ Library workspace
    src/features/materials/ Uploads, document tiles, and previews
    src/features/notebook/ Shared continuous notebook viewer
    src/features/reader/  PDF route integration and reading utilities
    src/lib/api/          Authenticated browser-to-API clients
    src/lib/supabase/     Browser, server, and session Supabase clients
    src/types/            Generated database types

docs/                     Product and technical documentation
supabase/                 Supabase configuration and database migrations
```

The repository uses npm workspaces. The web application and API run as separate applications.

A background worker for document processing is planned but not implemented.

Start with the [documentation index](./docs/coilora/README.md) for product scope, architecture, security boundaries, API design, and the implementation roadmap.

## Product boundaries

- Original uploads are stored without rewriting or overwriting their contents.
- Annotations and inserted note pages are stored separately from source PDFs.
- Application authorization is enforced through authenticated API routes and database and storage policies.
- Identifiable patient information is prohibited in the initial release.
- Document processing and content-safety checks remain incomplete.
- Planned explanations and generated study items must preserve citations.
- Suggested changes to study material must remain under the user's control.
- Pending web edits do not currently have durable offline recovery.

Coilora is web-first, not web-only. Native tablet applications and stylus-focused workflows are planned after the complete study loop is validated with target students.
