# Coilora Tech Stack

## 1. Stack policy

Coilora's baseline uses software that is free to obtain, open source, and self-hostable. A hosted free tier may be used for development, but the architecture must not require a proprietary API or a temporary trial.

This policy removes licence and per-request API fees. It does **not** make production hosting free: a public application still needs compute, storage, backups, bandwidth, email delivery, and possibly a GPU. Local development can run on the developer's computer; public deployment must be budgeted separately.

Before adding a dependency:

1. Verify the exact package and model licence.
2. Record its version, licence, source URL, and purpose.
3. Confirm commercial use is allowed.
4. Reject trials, source-available-only licences, and services that cannot be self-hosted.
5. Prefer one tool per responsibility.

Operating-system frameworks required by future native applications, such as Apple's PDFKit and PencilKit, are platform dependencies rather than open-source third-party services. They are not part of the web MVP stack.

## 2. Selected web-MVP stack

| Layer | Selected choice | Licence | Why it is selected |
|---|---|---|---|
| Language | TypeScript | Apache-2.0 | Shared types across the web, API, and worker |
| Web application | Next.js + React | MIT | Strong TypeScript ecosystem and responsive web support |
| Styling | Tailwind CSS | MIT | Fast, consistent interface development |
| Accessible primitives | Radix UI | MIT | Keyboard and screen-reader behavior without prescribing branding |
| Server state | TanStack Query | MIT | Caching, retries, invalidation, and mutation state |
| Validation | Zod | MIT | Shared runtime schemas for API and AI output |
| PDF rendering | PDF.js | Apache-2.0 | Mature browser rendering and selectable text layer |
| Annotation overlay | Konva + react-konva | MIT | Interactive shapes, drag/resize, touch, and stylus pointer events |
| PDF export | pdf-lib | MIT | Creates a new flattened export without changing the original |
| Application API | NestJS | MIT | Structured TypeScript modular monolith |
| API contract | OpenAPI | Apache-2.0 specification | Generates web and future native client contracts |
| Data platform | Self-hostable Supabase | Apache-2.0 repository; component licences vary | PostgreSQL, Auth, Storage, and RLS in one portable platform |
| Relational/search database | PostgreSQL + pgvector | PostgreSQL licence | Relational data, full-text search, and semantic retrieval |
| Background queue | pgmq | PostgreSQL licence | Durable jobs without adding Redis or a separate queue service |
| Document parsing | Docling | MIT | Local structured extraction for PDFs, tables, reading order, and OCR routing |
| OCR | PaddleOCR | Apache-2.0 | Local multilingual document OCR without per-page fees |
| Local AI runtime | Ollama | MIT | Easiest local model runtime for development and a private alpha |
| Generation model | Qwen3-8B, exact Apache-2.0 checkpoint | Apache-2.0 | Practical starting model for structured, source-bounded generation |
| Embedding model | Qwen3-Embedding-0.6B | Apache-2.0 | Local semantic embeddings without an external API |
| Review scheduling | ts-fsrs | MIT | TypeScript implementation of FSRS |
| Malware scanning | ClamAV | GPL | Scans untrusted uploaded documents in the worker |
| Bot protection | ALTCHA | MIT | Self-hosted proof-of-work protection for public forms |
| AI evaluation | Langfuse OSS, introduced when needed | MIT outside enterprise folders | Local prompt, trace, and evaluation tooling |
| Testing | Vitest, Testing Library, Playwright | Open-source licences | Unit, integration, accessibility, and complete browser-flow testing |

The authoritative dependency and licence register is [Free and Open-Source Tools](./09_FREE_AND_OPEN_SOURCE_TOOLS.md). This file defines architecture choices; that register contains licence and adoption details.

## 3. Simplest starting configuration

Start with one repository and five runtime units:

```text
Next.js web app
NestJS API
NestJS worker
Supabase stack: PostgreSQL + Auth + Storage + pgvector + pgmq
Local intelligence: Docling + PaddleOCR + Ollama
```

Do not add Kubernetes, Kafka, Redis, a separate vector database, paid AI APIs, commercial PDF SDKs, or multiple model runtimes to the MVP.

## 4. Frontend details

### Next.js

Use the App Router. Server-render public and account-entry pages. Keep the document workspace interactive on the client.

```text
app/
  (public)/
  (auth)/
  library/
  notebooks/[notebookId]/
  documents/[documentId]/
  study/
  review/
  settings/
```

### PDF and annotation layers

PDF.js renders each source page. Konva renders editable annotations above it. pdf-lib produces an optional new flattened PDF for export.

Durable annotations use PDF-page coordinates or normalized values from `0` to `1`, never browser pixels. Keep these layers independent:

```text
immutable source PDF
student annotation layer
accepted AI-highlight layer
temporary AI-suggestion layer
```

Use pointer events so mouse, touch, and stylus share one input path. The web MVP supports manual highlights, typed notes, and image-occlusion masks. Freehand ink is added only after latency and coordinate tests pass.

### Browser persistence

Use IndexedDB for cached metadata, unsaved editor state, queued idempotent mutations, and downloaded review items. PostgreSQL remains canonical. Sensitive offline storage is opt-in on shared devices.

## 5. Backend and worker

NestJS begins as a modular monolith for identity, notebooks, documents, annotations, retrieval, assistant conversations, study items, reviews, and privacy operations.

Use:

- REST/JSON for normal operations.
- Server-Sent Events for answer and job progress.
- Signed/resumable uploads for large files.
- pgmq for retryable jobs.

The worker runs document parsing, OCR, embeddings, generation, exports, deletion, and malware scanning. Jobs carry IDs rather than full files and must be idempotent.

## 6. Data platform decision

Use Supabase locally or self-hosted because its repository is open source and its architecture is based on PostgreSQL. Its hosted free plan may be used for an early development environment, but it is an optional convenience, not a permanent zero-cost assumption.

Keep the application portable:

- SQL migrations live in the repository.
- PostgreSQL is the source of truth.
- RLS policies are tested.
- Files use portable object paths and checksums.
- Platform-specific database objects never become the only record of user data.

## 7. Local AI and document stack

### Parsing and OCR

1. Extract text from digital PDFs with PDF.js/Docling.
2. Route only pages without reliable text to PaddleOCR.
3. Preserve page number, reading order, bounding boxes, and confidence.
4. Keep OCR output editable and linked to its source page.

### Generation

Ollama hosts an exact Apache-2.0 Qwen checkpoint. The NestJS worker calls it through a Coilora-owned `LanguageModelPort`. Validate all model output with Zod and resolve citation IDs on the server.

Qwen3-8B is a starting checkpoint, not an assumed quality guarantee. Test it against Coilora's medical-document evaluation set before beta. If the developer computer cannot run it acceptably, use a smaller Apache-2.0 Qwen checkpoint and record the quality trade-off.

### Embeddings

Generate embeddings locally with Qwen3-Embedding-0.6B, store them in pgvector, and combine semantic search with PostgreSQL full-text search. Do not add a separate vector database.

### Production scaling

Ollama is adequate for development and a small private alpha. If concurrent inference becomes a proven bottleneck, introduce vLLM—Apache-2.0—on a Linux GPU host without changing Coilora's model interface. GPU hosting costs money even though the software is open source.

## 8. Deployment

### Local development

Use Docker Compose or Podman Compose for PostgreSQL/Supabase, the API, worker, Docling, PaddleOCR, Ollama, and optional observability tools. Keep model files in a documented local volume rather than Git.

### Public deployment

Use the same containers on a Linux server:

```text
Caddy reverse proxy
Next.js web
NestJS API
NestJS worker
Supabase/PostgreSQL services
private object storage
Ollama initially; vLLM only after a concurrency test
```

Caddy provides HTTPS. Separate development, staging, and production data. Never copy real student documents into development.

There is no credible permanently free production plan for an AI document application. The software baseline is free; server, domain, storage, backups, email, and GPU capacity are operational costs.

## 9. Future native clients

### iPad

Use Swift/SwiftUI with PDFKit and PencilKit after web validation. These Apple frameworks are free with the platform SDK but are not open source; record them as unavoidable platform dependencies. Coilora's own document, annotation, citation, and review formats remain open and portable.

### Android

Choose Kotlin/Jetpack Compose or React Native after demand and stylus tests. Prefer open-source libraries, but treat Android platform APIs separately from third-party dependencies.

## 10. Explicitly excluded

- OpenAI, Anthropic, Google AI, or other paid model APIs.
- Google Document AI, Azure Document Intelligence, Mistral OCR, Mathpix, or paid OCR APIs.
- Deepgram, AssemblyAI, or paid transcription APIs.
- Nutrient, Apryse, or any commercial PDF SDK.
- Cloudflare Turnstile or other proprietary CAPTCHA services.
- Sentry's proprietary backend or proprietary-only analytics.
- Hosted free trials that require later migration to keep the application working.
- Models whose weights use research-only, non-commercial, or unclear licences.

Any exception requires a documented architecture decision and the user's explicit approval.

## References

- [PDF.js repository and Apache-2.0 licence](https://github.com/mozilla/pdf.js/)
- [Konva repository and MIT licence](https://github.com/konvajs/konva)
- [pdf-lib repository and MIT licence](https://github.com/Hopding/pdf-lib)
- [Supabase open-source repository](https://github.com/supabase/supabase)
- [pgvector repository](https://github.com/pgvector/pgvector)
- [pgmq repository and PostgreSQL licence](https://github.com/pgmq/pgmq)
- [Docling](https://docling.ai/)
- [PaddleOCR repository](https://github.com/PaddlePaddle/PaddleOCR)
- [Ollama MIT licence](https://github.com/ollama/ollama/blob/main/LICENSE)
- [Qwen3-8B Apache-2.0 checkpoint](https://huggingface.co/Qwen/Qwen3-8B)
- [Qwen3-Embedding-0.6B Apache-2.0 checkpoint](https://huggingface.co/Qwen/Qwen3-Embedding-0.6B)
- [vLLM Apache-2.0 licence](https://github.com/vllm-project/vllm/blob/main/LICENSE)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- [ClamAV](https://www.clamav.net/about)
- [ALTCHA](https://github.com/altcha-org/altcha)
- [Langfuse open-source licensing](https://langfuse.com/handbook/chapters/open-source)
