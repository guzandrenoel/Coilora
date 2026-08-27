# Coilora Documentation

> **Working name:** Coilora  
> **Tagline:** *Shed the overload. Keep what matters.*  
> **Product:** A cross-platform, source-grounded study workspace for medical and allied-health students  
> **Current strategy:** Web-first validation; native tablet applications after validation  
> **Dependency policy:** Free and open-source baseline; no required paid third-party API  
> **Version:** 0.4 — 27 August 2026

## Product summary

Coilora combines the document-centered note-taking experience associated with Goodnotes and the source-grounded learning workflow associated with NotebookLM:

**Import → Annotate → Highlight → Understand → Practice → Review**

The first product is a responsive web application. It validates whether students repeatedly use this complete loop before development expands into native tablet applications. Coilora is web-first, tablet-focused, and cross-platform by design—not iPad-exclusive.

## Current product decision

### Build first

- Import PDFs, images, and existing transcriptions.
- Read PDFs with manual highlights, typed notes, and image-occlusion masks.
- Suggest important passages non-destructively with exact page citations.
- Answer questions only from selected sources.
- Generate editable flashcards, cloze questions, and quizzes.
- Schedule reviews with FSRS.

### Build after validation

- Native iPad application with high-quality Apple Pencil input.
- Full offline notebook synchronization.
- Android tablet stylus application.
- Phone companions for review, scanning, recording, and reminders.

### Do not build yet

- Goodnotes-level browser handwriting.
- Audio transcription.
- Realtime collaboration.
- Institution dashboards or public marketplaces.
- Patient-specific or clinical decision-support features.

## First validation milestone

A student can:

1. Create an account and notebook.
2. Upload one lecture PDF.
3. Read and annotate it.
4. Ask a question and open working page citations.
5. Generate and edit ten flashcards.
6. Complete an FSRS review session.
7. Return the next day with progress intact.

## Selected technical direction

| Area | Initial choice |
|---|---|
| Web client | Next.js, React, TypeScript, Tailwind CSS |
| PDF experience | PDF.js + Konva annotation overlay + pdf-lib export |
| API and worker | NestJS modular monolith plus pgmq worker |
| Data platform | Self-hostable Supabase with PostgreSQL, Auth, and private Storage |
| Retrieval | PostgreSQL full-text search + pgvector |
| Document extraction | Docling with PaddleOCR fallback |
| Local AI | Ollama with exact Apache-2.0 Qwen checkpoints |
| Embeddings | Qwen3-Embedding-0.6B stored in pgvector |
| Review scheduling | ts-fsrs |
| Upload security | ClamAV; ALTCHA before public registration |
| Deployment | Local containers first; self-hosted Linux deployment for public testing |

The software has no required API licence fee. Production is not literally free: public hosting, storage, backups, email, bandwidth, and possibly GPU capacity must still be paid for or supplied by the developer.

## Documentation map

1. [Product overview and requirements](./01_PRODUCT_OVERVIEW_AND_REQUIREMENTS.md) — audience, workflow, requirements, boundaries, and success measures.
2. [Feature inspiration and differentiation](./FEATURE_INSPIRATION_AND_DIFFERENTIATION.md) — Goodnotes-inspired, NotebookLM-inspired, shared, and Coilora-specific features.
3. [Web MVP scope](./02_WEB_MVP_SCOPE.md) — first release, screens, acceptance criteria, and exclusions.
4. [Tech stack](./03_TECH_STACK.md) — selected architecture technologies and deployment approach.
5. [System architecture](./04_SYSTEM_ARCHITECTURE.md) — clients, backend, workers, storage, local intelligence, and future native applications.
6. [Database and storage](./05_DATABASE_AND_STORAGE.md) — tables, files, embeddings, local caching, and data ownership.
7. [API design](./06_API_DESIGN.md) — authentication, authorization, endpoints, contracts, and errors.
8. [AI and document pipeline](./07_AI_AND_DOCUMENT_PIPELINE.md) — local extraction, OCR, retrieval, citations, generation, and evaluation.
9. [Security, authentication, and privacy](./08_SECURITY_AUTH_AND_PRIVACY.md) — access controls, sessions, uploads, privacy, and compliance boundaries.
10. [Free and open-source tools](./09_FREE_AND_OPEN_SOURCE_TOOLS.md) — authoritative licence register, adoption gates, and excluded proprietary services.
11. [Development roadmap](./10_DEVELOPMENT_ROADMAP.md) — phased implementation, validation gates, testing, and native releases.
12. [Brand assets and startup animation](./11_BRAND_AND_STARTUP_ANIMATION.md) — selected logo direction, vector asset requirements, motion sequence, web implementation, native transition, and accessibility rules.

## Platform plan

| Platform | Role | Timing |
|---|---|---|
| Web | Complete study loop and early validation | First |
| iPad | Premium PDF and stylus notebook | After web validation |
| iPhone | Review, quick import, recording, and reminders | Later |
| Android tablet | Stylus notebook and complete study loop | After validation |
| Android phone | Review and companion workflows | Later |

All clients share accounts, original files, annotations, citations, study items, and review history. Platform-specific code must not own the only copy of student data.

## Non-negotiable product rules

- Original uploads remain immutable.
- AI suggestions never modify documents without approval.
- Factual answers and generated study items preserve source citations.
- If selected materials do not support an answer, Coilora says so.
- Uploaded material is untrusted data, never system instructions.
- Users can export and delete their data.
- Identifiable patient information is prohibited in the MVP.
- Authorization is enforced by the API and database policies.
- Required third-party dependencies are free, open source, and self-hostable.
- AI model licences are verified per exact checkpoint.
- A free trial is never treated as a production dependency.

## Open-source boundary

The current policy applies to Coilora's required third-party application stack. Future iOS/iPadOS and Android clients necessarily use platform SDKs that are not fully open source. Those are recorded as platform exceptions, while Coilora keeps portable PDFs, JSON annotations, citations, and review data under its own control.

## Branding and inspiration

“Coilora” remains a working name until formal trademark, domain, App Store, Play Store, and social-handle checks are completed.

The selected visual direction is a dark-blue and mint serpent forming the letter C around an open book. The production logo and startup-motion specification are maintained in [Brand Assets and Startup Animation](./11_BRAND_AND_STARTUP_ANIMATION.md); other documents should link to that specification rather than duplicate its timing or implementation details.

Goodnotes and NotebookLM are product references, not templates to copy. Coilora may learn from their interaction principles while retaining original branding, layouts, icons, copy, and implementation.

## Selected references

- [Next.js](https://nextjs.org/docs)
- [PDF.js](https://github.com/mozilla/pdf.js/)
- [Supabase open-source repository](https://github.com/supabase/supabase)
- [Docling](https://docling.ai/)
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- [Ollama](https://github.com/ollama/ollama)
- [Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B)
- [Qwen3-Embedding-0.6B](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [NotebookLM overview](https://support.google.com/notebooklm/answer/16164461)
- [Goodnotes features](https://www.goodnotes.com/features/)
