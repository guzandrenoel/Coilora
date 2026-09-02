"use client";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  createPageAnnotation,
  deletePageAnnotation,
  getPageAnnotations,
} from "@/lib/api/annotations-client";
import {
  createDocumentPageAnnotation,
  deleteDocumentPageAnnotation,
  getDocumentPageAnnotations,
} from "@/lib/api/document-annotations-client";
import type {
  AnnotationKind,
  CreateAnnotationInput,
  PageAnnotation,
} from "@/lib/api/types";
import {
  getNormalizedPoint,
  pointsToSvgPath,
  shouldAppendPoint,
} from "./annotation-geometry";
import styles from "./annotation-canvas.module.css";

export type EditorTool = AnnotationKind | "eraser" | "pan";
type PendingStroke = CreateAnnotationInput & { id: string; failed?: boolean };
const settings = {
  ink: { width: 0.004, opacity: 1 },
  highlight: { width: 0.03, opacity: 0.35 },
};
const sorted = (items: PageAnnotation[]) =>
  [...items].sort((a, b) => a.z_index - b.z_index);

export function AnnotationCanvas({
  notebookId,
  pageId,
  documentId,
  documentPageNumber,
  tool,
  color,
  onBusyChange,
}: {
  notebookId?: string;
  pageId?: string;
  documentId?: string;
  documentPageNumber?: number;
  tool: EditorTool;
  color: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [annotations, setAnnotations] = useState<PageAnnotation[]>([]);
  const [draft, setDraft] = useState<PendingStroke | null>(null);
  const [pending, setPending] = useState<PendingStroke[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [operations, setOperations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const activePointer = useRef<number | null>(null);
  const stroke = useRef<PendingStroke | null>(null);
  const saving = useRef(new Set<string>());
  const erasing = useRef(new Set<string>());
  const busy = draft !== null || pending.length > 0 || operations > 0;
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      setError(null);
      try {
        const loaded: PageAnnotation[] = [];
        let cursor: number | null = 0;
        while (cursor !== null && !cancelled) {
          const result: { items: PageAnnotation[]; nextPage: number | null } =
            documentId && documentPageNumber
              ? await getDocumentPageAnnotations(
                  documentId,
                  documentPageNumber,
                  cursor,
                )
              : await getPageAnnotations(
                  notebookId ?? "",
                  pageId ?? "",
                  cursor,
                );
          loaded.push(...result.items);
          cursor = result.nextPage;
        }
        if (!cancelled) setAnnotations(sorted(loaded));
      } catch (reason) {
        if (!cancelled) {
          setLoadFailed(true);
          setError(
            reason instanceof Error
              ? reason.message
              : "Annotations could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [notebookId, pageId, documentId, documentPageNumber, loadAttempt]);

  function point(event: ReactPointerEvent<SVGSVGElement>) {
    return getNormalizedPoint(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
  }
  function begin(event: ReactPointerEvent<SVGSVGElement>) {
    if (
      tool === "pan" ||
      tool === "eraser" ||
      loading ||
      loadFailed ||
      event.button !== 0 ||
      activePointer.current !== null
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    stroke.current = {
      id: crypto.randomUUID(),
      kind: tool,
      points: [point(event)],
      color,
      ...settings[tool],
    };
    setDraft(stroke.current);
  }
  function move(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerId !== activePointer.current || !stroke.current) return;
    event.preventDefault();
    const next = point(event);
    if (
      stroke.current.points.length >= 4096 ||
      !shouldAppendPoint(stroke.current.points, next)
    )
      return;
    stroke.current = {
      ...stroke.current,
      points: [...stroke.current.points, next],
    };
    setDraft(stroke.current);
  }
  async function save(item: PendingStroke) {
    if (saving.current.has(item.id)) return;
    saving.current.add(item.id);
    setOperations((value) => value + 1);
    setPending((current) =>
      current.map((stroke) =>
        stroke.id === item.id ? { ...stroke, failed: false } : stroke,
      ),
    );
    try {
      const input: CreateAnnotationInput = {
        id: item.id,
        kind: item.kind,
        points: item.points,
        color: item.color,
        width: item.width,
        opacity: item.opacity,
      };
      const created =
        documentId && documentPageNumber
          ? await createDocumentPageAnnotation(
              documentId,
              documentPageNumber,
              input,
            )
          : await createPageAnnotation(notebookId ?? "", pageId ?? "", input);
      setAnnotations((current) =>
        sorted([
          ...current.filter((annotation) => annotation.id !== created.id),
          created,
        ]),
      );
      setPending((current) =>
        current.filter((stroke) => stroke.id !== item.id),
      );
    } catch (reason) {
      setPending((current) =>
        current.map((stroke) =>
          stroke.id === item.id ? { ...stroke, failed: true } : stroke,
        ),
      );
      setError(
        reason instanceof Error ? reason.message : "Ink could not be saved.",
      );
    } finally {
      saving.current.delete(item.id);
      setOperations((value) => Math.max(0, value - 1));
    }
  }
  function finish(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerId !== activePointer.current || !stroke.current) return;
    event.preventDefault();
    const next = point(event);
    const current = stroke.current;
    if (
      current.points.length < 4096 &&
      shouldAppendPoint(current.points, next, 0.0001)
    )
      current.points = [...current.points, next];
    activePointer.current = null;
    stroke.current = null;
    setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (current.points.length < 2) return;
    setPending((items) => [...items, current]);
    setError(null);
    void save(current);
  }
  function cancel(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerId !== activePointer.current) return;
    // Keep collected ink if the device interrupts a pointer gesture.
    const current = stroke.current;
    activePointer.current = null;
    stroke.current = null;
    setDraft(null);
    if (current && current.points.length >= 2) {
      setPending((items) => [...items, current]);
      void save(current);
    }
  }
  async function erase(
    annotation: PageAnnotation,
    event: ReactPointerEvent<SVGPathElement>,
  ) {
    if (tool !== "eraser" || erasing.current.has(annotation.id)) return;
    event.preventDefault();
    event.stopPropagation();
    erasing.current.add(annotation.id);
    setAnnotations((items) =>
      items.filter((item) => item.id !== annotation.id),
    );
    setOperations((value) => value + 1);
    setError(null);
    try {
      if (documentId && documentPageNumber)
        await deleteDocumentPageAnnotation(
          documentId,
          documentPageNumber,
          annotation.id,
        );
      else
        await deletePageAnnotation(
          notebookId ?? "",
          pageId ?? "",
          annotation.id,
        );
    } catch (reason) {
      setAnnotations((items) => sorted([...items, annotation]));
      setError(
        reason instanceof Error
          ? reason.message
          : "The annotation could not be erased.",
      );
    } finally {
      erasing.current.delete(annotation.id);
      setOperations((value) => Math.max(0, value - 1));
    }
  }
  const failed = pending.filter((item) => item.failed);
  return (
    <>
      <svg
        className={styles.layer}
        data-tool={tool}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        role="img"
        aria-label="Page annotation canvas"
        aria-busy={loading || operations > 0}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
      >
        {annotations.map((annotation) => (
          <path
            className={styles.stroke}
            key={annotation.id}
            d={pointsToSvgPath(annotation.points)}
            stroke={annotation.color}
            strokeWidth={annotation.width}
            opacity={annotation.opacity}
            pointerEvents={tool === "eraser" ? "stroke" : "none"}
            onPointerDown={(event) => void erase(annotation, event)}
          />
        ))}
        {pending.map((item) => (
          <path
            className={styles.stroke}
            key={item.id}
            d={pointsToSvgPath(item.points)}
            stroke={item.color}
            strokeWidth={item.width}
            opacity={item.opacity}
            pointerEvents="none"
          />
        ))}
        {draft && draft.points.length > 1 ? (
          <path
            className={styles.draft}
            d={pointsToSvgPath(draft.points)}
            stroke={draft.color}
            strokeWidth={draft.width}
            opacity={draft.opacity}
          />
        ) : null}
      </svg>
      {loading || operations > 0 ? (
        <p className={styles.status} role="status">
          {loading ? "Loading annotations..." : "Saving..."}
        </p>
      ) : null}
      {error || failed.length ? (
        <div className={styles.error}>
          <span role="alert">
            {failed.length
              ? "Unsaved ink is kept on this page. Retry before leaving."
              : error}
          </span>
          {failed.length ? (
            <button
              type="button"
              disabled={operations > 0}
              onClick={() => {
                setError(null);
                for (const item of failed) void save(item);
              }}
            >
              Retry save
            </button>
          ) : loadFailed ? (
            <button
              type="button"
              onClick={() => setLoadAttempt((value) => value + 1)}
            >
              Retry load
            </button>
          ) : (
            <button type="button" onClick={() => setError(null)}>
              Dismiss
            </button>
          )}
        </div>
      ) : null}
    </>
  );
}
