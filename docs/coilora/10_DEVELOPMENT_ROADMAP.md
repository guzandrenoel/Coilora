# Coilora Development Roadmap

## 1. Delivery principle

Ship the smallest complete learning loop, test it with real students, and expand only after evidence. The first objective is not “build Goodnotes plus NotebookLM.” It is to prove that students repeatedly turn their own lecture material into cited understanding and active recall.

## Current progress, 1 September 2026

Implemented:

- Account authentication and protected workspace access.
- Course and notebook organization with persisted accent and cover colors.
- Private document upload, completion verification, and saved-document listing.
- Authenticated PDF read sessions and an in-app PDF reader with navigation and fit/zoom controls.
- Persistent blank notebook pages with blank, dotted, ruled, grid, and Cornell paper styles.
- API validation, ownership checks, Row Level Security, and automated checks for the implemented areas.

Next implementation slice:

1. Open a blank notebook page in a dedicated editor route.
2. Render its persisted paper style at full size.
3. Add a reusable annotation layer for blank and PDF pages.
4. Persist drawing, highlighting, erasing, and undo/redo without changing original PDFs.
5. Add lazy PDF page thumbnails so large documents remain responsive.

Document processing, OCR, retrieval, cited assistance, study generation, and review scheduling remain later roadmap work.

## 2. Phase 0: foundation and research

### Build and decide

- Confirm Coilora as the working name; postpone final branding expenditure.
- Convert the selected serpent-and-book logo into a cleaned, layered SVG master and create static, light, dark, icon, startup, and reduced-motion variants.
- Interview the girlfriend use case and at least five additional target students.
- Collect synthetic or permission-cleared representative PDFs, scans, diagrams, and transcripts.
- Create the repository, environments, CI, migrations, and documentation.
- Create a dependency licence manifest and reject required paid, trial-only, or non-open-source services.
- Define the platform-neutral document, citation, annotation, and study-item formats.
- Define the prohibition on identifiable patient information.
- Create low-fidelity wireframes for the complete web journey.

### Exit criteria

- At least five target-user interviews are summarized.
- The first release and exclusions are written clearly.
- Test materials cover text PDFs, scanned pages, tables, diagrams, and poor OCR.
- The architecture and security boundaries are agreed.

## 3. Phase 1: web foundation

### Build

- Next.js application shell.
- Accessible web startup transition using the layered Coilora SVG, with reduced-motion support and no artificial loading delay.
- Local/self-hosted Supabase development stack.
- Account creation, verification, sign-in, sign-out, and password recovery.
- Library, course, and notebook navigation.
- NestJS API with JWT verification and ownership checks.
- Initial database schema, migrations, and Row Level Security tests.
- Private storage buckets and signed upload flow.
- Privacy-safe structured logs and health checks; OpenTelemetry only when needed.

### Exit criteria

- A user can create an account and a notebook.
- A user cannot access another user's records or storage objects.
- Development and staging environments are isolated.
- Secrets are not present in browser bundles or source control.

## 4. Phase 2: import and document reader

### Build

- PDF, image, and transcription uploads.
- Upload progress, retry, cancellation, and failure states.
- File validation, ClamAV scanning, and sanitization.
- PDF text and layout extraction.
- Docling extraction with PaddleOCR routing for scanned pages.
- Page previews and thumbnails.
- PDF.js reader with page navigation, zoom, and search.
- Persistent blank notebook pages and selectable paper styles.
- A shared page-editor shell for blank pages and PDF pages.
- Manual text highlights and typed notes.
- Processing-status events.

### Exit criteria

- Representative files import successfully.
- A failed worker job can retry without duplicate pages or spans.
- Originals are not overwritten.
- Highlights remain aligned after resize and zoom.
- Large documents do not cause unbounded browser memory use.

## 5. Phase 3: cited AI assistant

### Build

- Source-span model with page and geometry provenance.
- Local Qwen embeddings and PostgreSQL full-text indexes.
- Hybrid retrieval with ownership and source filters.
- Notebook/document source selector.
- Streaming assistant through the private Ollama runtime.
- Structured citation validation.
- “Not enough evidence in your sources” behavior.
- Evaluation fixtures for medical terms, tables, and conflicting sources.

### Exit criteria

- Every supported factual answer has valid, clickable citations.
- Unauthorized documents never enter retrieval context.
- Citation accuracy meets the agreed evaluation threshold.
- Prompt-injection fixtures cannot override source or authorization boundaries.

## 6. Phase 4: highlighting and study generation

### Build

- AI highlight suggestions as a preview layer.
- Accept, reject, and adjust actions.
- Basic, bidirectional, cloze, and multiple-choice generation.
- Image-occlusion masks from page crops.
- Draft study-item editor.
- Duplicate and near-duplicate warnings.
- Source links from cards back to document pages.

### Exit criteria

- AI cannot permanently modify a source document.
- Accepted and rejected suggestion states persist.
- Generated items are drafts and editable.
- Every generated item retains a valid source reference.
- Human evaluation checks answerability, ambiguity, distractor quality, and usefulness.

## 7. Phase 5: review loop and private web beta

### Build

- ts-fsrs scheduling.
- Again, Hard, Good, and Easy grading.
- Due, new, and overdue queues.
- Exam date and daily target.
- Weak-topic calculation from review evidence.
- First-party funnel events or self-hosted Umami, with no study content.
- Feedback reporting.
- Account export and deletion.
- Privacy policy, terms, support contact, and onboarding warnings.

### Private beta

Start with 10–20 medical, medical-technology, nursing, or allied-health students. Use invitation-only accounts or an allowlist before opening general registration.

### Exit criteria

- Students complete the full Import → Understand → Practice → Review loop.
- Review events remain correct across refreshes and retries.
- No cross-user data exposure occurs.
- Major failures are visible through monitoring.
- Interviews reveal whether full stylus annotation is a decisive need.

## 8. Phase 6: improve retention and reliability

Prioritize measured problems:

- Processing failures.
- Citation quality.
- Card usefulness.
- Review completion.
- Onboarding drop-off.
- Mobile-browser usability.
- Compute, storage, backup, and model latency per active student.

Do not add native clients merely because the roadmap says they are next. Apply the native transition gate from the web MVP document.

## 9. Phase 7: native iPad notebook

Begin only after web validation.

### Build

- SwiftUI application using the existing API.
- Static system launch screen followed by the Coilora animation in the first SwiftUI view, with a seamless transition and reduced-motion behavior.
- PDFKit document viewer.
- PencilKit annotation overlays.
- Local persistence and a synchronization outbox.
- Lasso, text, highlighter, eraser, undo, and redo.
- Offline recent documents and downloaded reviews.
- Sign in with Apple where required.
- TestFlight distribution.

### Exit criteria

- Pencil input is low latency on representative hardware.
- No local ink is lost during network failure or application termination.
- Annotations render consistently between web and iPad.
- Conflict scenarios preserve user work.
- TestFlight users complete the same shared learning loop.

## 10. Phase 8: phone and Android expansion

Sequence based on usage evidence:

1. Responsive mobile web improvements.
2. iPhone companion for review, import, recording, and reminders.
3. Android tablet stylus prototype.
4. Android phone companion.

Choose React Native or native Kotlin after testing the Android PDF and stylus requirements. Do not promise identical low-level ink behavior across platforms; promise compatible student data and reliable synchronization.

## 11. Suggested first eight weeks

### Weeks 1–2

- User interviews and workflow wireframes.
- Repository and environments.
- Authentication and database foundations.
- Library and notebook skeleton.

### Weeks 3–4

- Signed PDF upload.
- Worker pipeline.
- PDF.js reader.
- Text extraction and processing states.

### Weeks 5–6

- Source spans, embeddings, and hybrid retrieval.
- Cited assistant.
- Citation navigation and evaluation fixtures.

### Weeks 7–8

- Study-item generation.
- Basic review queue.
- Complete vertical-slice usability test with the girlfriend and initial students.

This schedule is a planning target, not a guaranteed estimate. OCR complexity, PDF diversity, AI evaluation, and available development time can change it significantly.

## 12. Testing strategy

### Automated

- Unit tests for domain and scheduling rules.
- Database constraint and RLS tests.
- API integration and idempotency tests.
- Worker retry tests.
- Retrieval and citation fixtures.
- Playwright tests for the complete user journey.
- Dependency, secret, and static security scanning.

### Manual

- Real lecture PDFs and scans with permission.
- Chrome, Edge, Safari, tablet, and phone browser checks.
- Keyboard-only and screen-reader navigation.
- Slow network, lost connection, repeated submission, and expired-session cases.
- Student observation sessions instead of relying only on surveys.

### Native phase

- Physical iPads and Apple Pencils.
- Multiple document sizes and orientations.
- Split View, Stage Manager, keyboard, and trackpad.
- Offline editing and synchronization conflicts.

## 13. Main risks

| Risk | Mitigation |
|---|---|
| Building too much before validation | Ship the complete web vertical slice first |
| Hallucinated answers | Strict-source retrieval, structured citations, and evaluation |
| Cross-user data exposure | Server authorization, RLS, signed URLs, and negative tests |
| Difficult scanned documents | OCR routing and representative test corpus |
| Browser annotation complexity | Limit MVP to text/typed annotations and basic occlusion |
| Self-hosted AI resource growth | Quotas, caching, smaller approved models, bounded concurrency, and asynchronous work |
| Platform lock-in | Open APIs, standard PDFs, PostgreSQL, and neutral annotation coordinates |
| Native rewrite waste | Reuse backend, contracts, source model, and study engine |
| Sensitive medical uploads | Explicit prohibition, reporting, deletion, and later compliance review |

## 14. Definition of web MVP done

The web MVP is done only when a target student can independently:

1. Create and verify an account.
2. Create a course or notebook.
3. Upload a lecture document.
4. Observe meaningful processing states.
5. Read and highlight the document.
6. Receive and control AI suggestions.
7. Ask a question and open accurate citations.
8. Generate and edit study items.
9. Complete a review session.
10. Return later with documents and progress intact.
11. Export or request deletion of their account data.

## References

- [Next.js testing guidance](https://nextjs.org/docs/app/guides/testing)
- [Playwright](https://playwright.dev/)
- [Supabase local development](https://supabase.com/docs/guides/local-development)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
