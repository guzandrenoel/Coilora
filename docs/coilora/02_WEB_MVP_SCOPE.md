# Coilora Web MVP Scope

## 1. Purpose

The web MVP tests whether medical and allied-health students value Coilora's complete learning loop before significant investment in native tablet annotation.

The MVP is successful when students repeatedly move from uploaded lecture material to cited understanding and active recall. It is not successful merely because the PDF viewer or AI chat works independently.

### Current implementation boundary

The current web application supports private uploads, saved-document listing, PDF reading with page navigation and zoom, and creation of persistent blank notebook pages in five paper styles. Blank page editing, PDF annotations, document processing, and the learning features later in this journey remain planned work.

## 2. Core user journey

```text
Sign up
  → Create a course or notebook
  → Upload a PDF, image, or transcription
  → Read and add basic annotations
  → Review suggested important passages
  → Ask a source-grounded question
  → Generate study items
  → Complete today's review
```

## 3. The six MVP capabilities

### 3.1 Import study material

Users can upload:

- Text-based PDFs.
- Scanned PDFs.
- JPG, PNG, and WebP images.
- Plain-text or Markdown transcriptions.

The interface displays separate upload, extraction, OCR, indexing, ready, and failed states. A student can delete a failed upload or retry a recoverable operation.

### 3.2 Read and annotate

The web viewer must provide:

- Page thumbnails and page navigation.
- Zoom and fit-to-width controls.
- Search within text-based PDFs.
- Text selection and manual highlighting.
- Typed notes associated with a selected passage or page.
- Basic image-occlusion masks.
- Citation navigation to a page and highlighted source region.

Freehand drawing may be experimental. Goodnotes-level handwriting, pressure-sensitive ink, lasso editing, and perfect browser offline editing are explicitly outside the first validation release.

The implemented reader currently covers authenticated PDF access, rendering, page navigation, and fit/zoom controls. The annotation items above describe the target MVP, not current behavior.

### 3.3 AI smart highlighting

Coilora proposes important passages without changing the source.

Each suggestion includes:

- Exact source span.
- Document and page.
- Category, such as definition, mechanism, comparison, exception, laboratory value, or process step.
- Short explanation of why it may matter.
- Accept, reject, and adjust actions.

Accepted suggestions become ordinary user-controlled highlights. Rejected suggestions remain recorded so they are not repeatedly shown.

### 3.4 Source-grounded assistant

Users choose the active course, notebook, or documents. Answers:

- Use only authorized selected sources in strict-source mode.
- Cite the supporting pages or transcript timestamps.
- Open the original location when a citation is selected.
- State when the sources do not contain enough evidence.
- Stream progressively after retrieval completes.
- Can be converted into an editable note or draft study item.

### 3.5 Study-material generation

Users generate editable:

- Basic question-and-answer cards.
- Bidirectional cards.
- Cloze questions.
- Multiple-choice questions.
- Image-occlusion cards.
- Short case-style exercises when supported by the sources.

Every generated item begins as a draft, retains citations, and can be edited or deleted before entering the review queue.

### 3.6 Spaced-repetition review

The review experience provides:

- Due cards and new cards.
- Again, Hard, Good, and Easy grades.
- FSRS-based scheduling.
- An estimated session length.
- Review history.
- Weak-topic signals based on performance rather than AI opinion.
- Optional exam date and daily study target.

## 4. Required screens

1. Landing page.
2. Sign up, sign in, password reset, and verification.
3. Onboarding and patient-information warning.
4. Library dashboard.
5. Course/notebook view.
6. Import flow and processing status.
7. Document reader.
8. AI suggestion panel.
9. Source-grounded assistant.
10. Study-item editor.
11. Review session.
12. Progress and weak-topic summary.
13. Account, privacy, export, and deletion settings.

## 5. MVP acceptance criteria

The release is ready for a private student beta when:

- A new user can finish the complete journey without developer assistance.
- Text PDFs and representative scanned lecture PDFs process successfully.
- Every factual assistant answer either has working citations or returns a clear insufficient-evidence response.
- Clicking a citation opens the correct page.
- Generated cards remain editable and preserve their sources.
- Review events do not duplicate after refresh or retry.
- One user cannot access another user's documents by changing a URL or identifier.
- Failed uploads and jobs can be retried safely.
- Account export and deletion flows are testable.
- Errors are captured without logging uploaded content or AI answers unnecessarily.

## 6. Explicit MVP exclusions

- Full freehand notebook parity with Goodnotes.
- Native Apple Pencil or Android stylus optimization.
- Live lecture recording.
- Real-time collaborative notes.
- Public sharing or a notes marketplace.
- School administration dashboards.
- Automatic medical diagnosis or treatment recommendations.
- Identifiable patient records.
- Fully automatic activation of AI-generated cards.
- Native app subscriptions.

## 7. Validation metrics

### Activation

- Percentage of users who upload a source.
- Percentage who receive a ready document.
- Percentage who ask a cited question.
- Percentage who activate at least one generated card.

### Complete-loop use

- Percentage completing Import → Ask → Generate → Review.
- Time to first completed review.
- Citation-open rate.
- Draft-to-active card conversion.
- Seven-day return rate.
- Reviews completed per active student.

### Quality guardrails

- Cross-user access incidents: zero.
- Unsupported factual answers presented without warning: zero target.
- Broken citation rate.
- Document processing failure rate.
- Generated-card deletion and correction rate.

## 8. Web-to-native transition gate

Begin the native iPad notebook only when most of the following are true:

- At least 10–20 target students have tested the web product.
- Multiple students return over two or more weeks.
- Students create or review study items from their own materials.
- Interviews confirm that stylus annotation is a major reason they would adopt or pay for Coilora.
- Citation quality and document processing are reliable enough that the native editor will not hide a weak learning workflow.

The exact user counts are planning thresholds, not universal product-market-fit rules.
