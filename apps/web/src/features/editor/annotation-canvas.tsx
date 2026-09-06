"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { getPageAnnotations } from "@/lib/api/annotations-client";
import {
  createTargetAnnotation,
  deleteTargetAnnotation,
  updateTargetAnnotation,
  type AnnotationHistoryEntry,
  type AnnotationTarget,
} from "@/lib/api/annotation-target-client";
import { getDocumentPageAnnotations } from "@/lib/api/document-annotations-client";
import type {
  AnnotationKind,
  CreateAnnotationInput,
  PageAnnotation,
} from "@/lib/api/types";
import {
  createTextBoxPoints,
  getAnnotationBounds,
  getNormalizedPoint,
  pointsToSvgPath,
  shouldAppendPoint,
  translateAnnotationPoints,
} from "./annotation-geometry";
import styles from "./annotation-canvas.module.css";
import { eraseAtPoint, strokeIntersectsEraser } from "./annotation-eraser";
import type { EraserMode } from "./eraser-settings";
import { annotationCreateInput } from "@/lib/api/annotation-target-client";

export type EditorTool = AnnotationKind | "eraser" | "select";

type PendingAnnotation = CreateAnnotationInput & {
  id: string;
  failed?: boolean;
};

type TextDraft = {
  annotation?: PageAnnotation;
  points: PageAnnotation["points"];
  text: string;
  color: string;
  fontSize: number;
};

type MoveGesture = {
  annotation: PageAnnotation;
  start: { x: number; y: number };
};

const sorted = (items: PageAnnotation[]) =>
  [...items].sort((a, b) => a.z_index - b.z_index);
const defaultTextFontSize = 0.025;
const strokePathCache = new WeakMap<PageAnnotation["points"], string>();
function cachedStrokePath(points: PageAnnotation["points"]) {
  let path = strokePathCache.get(points);
  if (path === undefined) {
    path = pointsToSvgPath(points);
    strokePathCache.set(points, path);
  }
  return path;
}

export function AnnotationCanvas({
  notebookId,
  pageId,
  documentId,
  documentPageNumber,
  targetKey,
  pageHeight,
  tool,
  eraserMode = "partial",
  eraserRadius = 12,
  color,
  strokeWidth,
  opacity,
  disabled = false,
  refreshVersion = 0,
  onBusyChange,
  onCommit,
}: {
  notebookId?: string;
  pageId?: string;
  documentId?: string;
  documentPageNumber?: number;
  targetKey: string;
  pageHeight: number;
  tool: EditorTool;
  eraserMode?: EraserMode;
  eraserRadius?: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  disabled?: boolean;
  refreshVersion?: number;
  onBusyChange?: (busy: boolean) => void;
  onCommit?: (entry: AnnotationHistoryEntry) => void;
}) {
  const target = useMemo<AnnotationTarget>(
    () =>
      documentId && documentPageNumber
        ? {
            kind: "document-page",
            key: targetKey,
            documentId,
            pageNumber: documentPageNumber,
          }
        : {
            kind: "notebook-page",
            key: targetKey,
            notebookId: notebookId ?? "",
            pageId: pageId ?? "",
          },
    [documentId, documentPageNumber, notebookId, pageId, targetKey],
  );
  const [annotations, setAnnotations] = useState<PageAnnotation[]>([]);
  const [draft, setDraft] = useState<PendingAnnotation | null>(null);
  const [pending, setPending] = useState<PendingAnnotation[]>([]);
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveDraft, setMoveDraft] = useState<PageAnnotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const [operations, setOperations] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);
  const activePointer = useRef<number | null>(null);
  const stroke = useRef<PendingAnnotation | null>(null);
  const moveGesture = useRef<MoveGesture | null>(null);
  const moveDraftRef = useRef<PageAnnotation | null>(null);
  const saving = useRef(new Set<string>());
  const erasing = useRef(new Set<string>());
  const wipeFrame = useRef<number | null>(null);
  const wipeQueue = useRef<{ x: number; y: number }[]>([]);
  useEffect(
    () => () => {
      if (wipeFrame.current !== null) cancelAnimationFrame(wipeFrame.current);
    },
    [],
  );
  const wipe = useRef<{
    before: PageAnnotation[];
    current: PageAnnotation[];
    last: { x: number; y: number };
    width: number;
    height: number;
  } | null>(null);
  const [wiping, setWiping] = useState(false);
  const [eraserCursor, setEraserCursor] = useState<{
    x: number;
    y: number;
    rx: number;
    ry: number;
  } | null>(null);
  const busy =
    wiping ||
    draft !== null ||
    textDraft !== null ||
    moveDraft !== null ||
    pending.length > 0 ||
    operations > 0;

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useLayoutEffect(() => {
    if (!textDraft) return;
    const editor = textEditorRef.current;
    if (!editor) return;
    editor.focus();
  }, [textDraft]);

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
        if (!cancelled) {
          const next = sorted(loaded);
          setAnnotations(next);
          setSelectedId((current) =>
            next.some((annotation) => annotation.id === current)
              ? current
              : null,
          );
        }
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
  }, [
    notebookId,
    pageId,
    documentId,
    documentPageNumber,
    loadAttempt,
    refreshVersion,
  ]);

  function point(clientX: number, clientY: number) {
    const rectangle = svgRef.current?.getBoundingClientRect();
    return getNormalizedPoint(
      clientX,
      clientY,
      rectangle ?? { left: 0, top: 0, width: 0, height: 0 },
    );
  }

  function begin(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "select") {
      if (event.target === event.currentTarget) setSelectedId(null);
      return;
    }
    if (
      disabled ||
      loading ||
      loadFailed ||
      operations > 0 ||
      textDraft !== null ||
      event.button !== 0 ||
      activePointer.current !== null
    ) {
      return;
    }
    event.preventDefault();
    if (tool === "eraser") {
      if (eraserMode === "stroke") return;
      if (pending.length) return;
      const rectangle = event.currentTarget.getBoundingClientRect();
      const start = point(event.clientX, event.clientY);
      wipe.current = {
        before: annotations,
        current: annotations,
        last: start,
        width: rectangle.width,
        height: rectangle.height,
      };
      activePointer.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      setWiping(true);
      wipeTo(start);
      return;
    }
    if (tool === "text") {
      setTextDraft({
        points: createTextBoxPoints(point(event.clientX, event.clientY)),
        text: "",
        color,
        fontSize: strokeWidth,
      });
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    stroke.current = {
      id: crypto.randomUUID(),
      kind: tool,
      points: [point(event.clientX, event.clientY)],
      color,
      width: strokeWidth,
      opacity,
    };
    setDraft(stroke.current);
  }

  function beginMove(
    annotation: PageAnnotation,
    event: ReactPointerEvent<Element>,
  ) {
    if (
      tool !== "select" ||
      disabled ||
      loading ||
      loadFailed ||
      operations > 0 ||
      event.button !== 0 ||
      activePointer.current !== null
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    moveGesture.current = {
      annotation,
      start: point(event.clientX, event.clientY),
    };
    setSelectedId(annotation.id);
    moveDraftRef.current = annotation;
    setMoveDraft(annotation);
  }

  function move(event: ReactPointerEvent<SVGSVGElement>) {
    if (tool === "eraser" && eraserMode !== "stroke") {
      const rect = event.currentTarget.getBoundingClientRect();
      const next = point(event.clientX, event.clientY);
      setEraserCursor({
        ...next,
        rx: eraserRadius / rect.width,
        ry: eraserRadius / rect.height,
      });
      if (event.pointerId === activePointer.current && wipe.current) {
        event.preventDefault();
        wipeQueue.current.push(next);
        if (wipeFrame.current === null) {
          wipeFrame.current = requestAnimationFrame(() => flushWipe());
        }
        return;
      }
    }
    if (event.pointerId !== activePointer.current) return;
    if (moveGesture.current) {
      event.preventDefault();
      const current = point(event.clientX, event.clientY);
      const gesture = moveGesture.current;
      const moved = {
        ...gesture.annotation,
        points: translateAnnotationPoints(
          gesture.annotation.points,
          current.x - gesture.start.x,
          current.y - gesture.start.y,
        ),
      };
      moveDraftRef.current = moved;
      setMoveDraft(moved);
      return;
    }
    if (!stroke.current) return;
    event.preventDefault();
    const next = point(event.clientX, event.clientY);
    if (
      stroke.current.points.length >= 4096 ||
      !shouldAppendPoint(stroke.current.points, next)
    ) {
      return;
    }
    stroke.current = {
      ...stroke.current,
      points: [...stroke.current.points, next],
    };
    setDraft(stroke.current);
  }

  async function save(item: PendingAnnotation) {
    if (saving.current.has(item.id)) return;
    saving.current.add(item.id);
    setOperations((value) => value + 1);
    setPending((current) =>
      current.map((pendingAnnotation) =>
        pendingAnnotation.id === item.id
          ? { ...pendingAnnotation, failed: false }
          : pendingAnnotation,
      ),
    );
    try {
      const created = await createTargetAnnotation(target, item);
      setAnnotations((current) =>
        sorted([
          ...current.filter((annotation) => annotation.id !== created.id),
          created,
        ]),
      );
      setPending((current) =>
        current.filter((pendingAnnotation) => pendingAnnotation.id !== item.id),
      );
      onCommit?.({ target, before: null, after: created });
    } catch (reason) {
      setPending((current) =>
        current.map((pendingAnnotation) =>
          pendingAnnotation.id === item.id
            ? { ...pendingAnnotation, failed: true }
            : pendingAnnotation,
        ),
      );
      setError(
        reason instanceof Error
          ? reason.message
          : "The annotation could not be saved.",
      );
    } finally {
      saving.current.delete(item.id);
      setOperations((value) => Math.max(0, value - 1));
    }
  }

  async function persistMove(
    annotation: PageAnnotation,
    points: PageAnnotation["points"],
  ) {
    setOperations((value) => value + 1);
    setError(null);
    try {
      const updated = await updateTargetAnnotation(target, annotation.id, {
        points,
        revision: annotation.revision,
      });
      setAnnotations((current) =>
        sorted(
          current.map((item) => (item.id === updated.id ? updated : item)),
        ),
      );
      onCommit?.({ target, before: annotation, after: updated });
    } catch (reason) {
      setAnnotations((current) =>
        sorted(
          current.map((item) =>
            item.id === annotation.id ? annotation : item,
          ),
        ),
      );
      setError(
        reason instanceof Error
          ? reason.message
          : "The annotation could not be moved.",
      );
    } finally {
      setOperations((value) => Math.max(0, value - 1));
    }
  }

  async function commitText(draftToSave: TextDraft) {
    const text = draftToSave.text.trim();
    setTextDraft(null);
    if (!text) return;

    if (!draftToSave.annotation) {
      const pendingText: PendingAnnotation = {
        id: crypto.randomUUID(),
        kind: "text",
        points: draftToSave.points,
        color: draftToSave.color,
        width: 0.002,
        opacity: 1,
        text,
        fontSize: draftToSave.fontSize,
      };
      setPending((items) => [...items, pendingText]);
      setError(null);
      void save(pendingText);
      return;
    }

    const before = draftToSave.annotation;
    if (
      before.text_content === text &&
      before.color === draftToSave.color &&
      before.font_size === draftToSave.fontSize
    ) {
      return;
    }
    setOperations((value) => value + 1);
    setError(null);
    try {
      const updated = await updateTargetAnnotation(target, before.id, {
        points: before.points,
        revision: before.revision,
        text,
        fontSize: draftToSave.fontSize,
        color: draftToSave.color,
      });
      setAnnotations((current) =>
        sorted(
          current.map((item) => (item.id === updated.id ? updated : item)),
        ),
      );
      onCommit?.({ target, before, after: updated });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The text annotation could not be saved.",
      );
    } finally {
      setOperations((value) => Math.max(0, value - 1));
    }
  }

  function finish(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerId !== activePointer.current) return;
    event.preventDefault();
    if (wipe.current) {
      flushWipe();
      wipeTo(point(event.clientX, event.clientY));
      const gesture = wipe.current;
      wipe.current = null;
      activePointer.current = null;
      setWiping(false);
      void persistWipe(gesture.before, gesture.current);
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      return;
    }

    if (moveGesture.current) {
      const gesture = moveGesture.current;
      const moved = moveDraftRef.current;
      activePointer.current = null;
      moveGesture.current = null;
      moveDraftRef.current = null;
      setMoveDraft(null);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (!moved) return;
      const changed = moved.points.some(
        (item, index) =>
          item.x !== gesture.annotation.points[index]?.x ||
          item.y !== gesture.annotation.points[index]?.y,
      );
      if (!changed) return;
      setAnnotations((current) =>
        current.map((item) => (item.id === moved.id ? moved : item)),
      );
      void persistMove(gesture.annotation, moved.points);
      return;
    }

    if (!stroke.current) return;
    const next = point(event.clientX, event.clientY);
    const current = stroke.current;
    if (
      current.points.length < 4096 &&
      shouldAppendPoint(current.points, next, 0.0001)
    ) {
      current.points = [...current.points, next];
    }
    activePointer.current = null;
    stroke.current = null;
    setDraft(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current.points.length < 2) return;
    setPending((items) => [...items, current]);
    setError(null);
    void save(current);
  }

  function cancel(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.pointerId !== activePointer.current) return;
    if (wipe.current) {
      flushWipe();
      const gesture = wipe.current;
      wipe.current = null;
      activePointer.current = null;
      setWiping(false);
      void persistWipe(gesture.before, gesture.current);
      return;
    }
    if (moveGesture.current) {
      activePointer.current = null;
      moveGesture.current = null;
      moveDraftRef.current = null;
      setMoveDraft(null);
      return;
    }
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

  function flushWipe() {
    if (wipeFrame.current !== null) cancelAnimationFrame(wipeFrame.current);
    wipeFrame.current = null;
    const points = wipeQueue.current;
    wipeQueue.current = [];
    for (const next of points) wipeTo(next, false);
    if (wipe.current) setAnnotations(wipe.current.current);
  }

  function wipeTo(next: { x: number; y: number }, publish = true) {
    const gesture = wipe.current;
    if (!gesture) return;
    const start = gesture.last;
    const distance = Math.hypot(
      (next.x - start.x) * gesture.width,
      (next.y - start.y) * gesture.height,
    );
    const steps = Math.max(1, Math.ceil(distance / (eraserRadius / 3)));
    const candidates = new Set(
      gesture.current
        .filter(
          (item) =>
            item.kind !== "text" &&
            strokeIntersectsEraser(
              item.points,
              start,
              next,
              eraserRadius +
                (item.width * Math.max(gesture.width, gesture.height)) / 2,
              gesture.width,
              gesture.height,
            ),
        )
        .map((item) => item.id),
    );
    if (candidates.size === 0) {
      gesture.last = next;
      return;
    }
    for (let step = 1; step <= steps; step++) {
      const center = {
        x: start.x + ((next.x - start.x) * step) / steps,
        y: start.y + ((next.y - start.y) * step) / steps,
      };
      gesture.current = gesture.current.flatMap((item) => {
        if (!candidates.has(item.id)) return [item];
        const parts = eraseAtPoint(
          item.points,
          center,
          eraserRadius +
            (item.width * Math.max(gesture.width, gesture.height)) / 2,
          gesture.width,
          gesture.height,
        );
        if (parts.length === 1 && parts[0] === item.points) return [item];
        if (
          parts.length === 1 &&
          parts[0].length === item.points.length &&
          parts[0].every(
            (p, i) => p.x === item.points[i].x && p.y === item.points[i].y,
          )
        )
          return [item];
        return parts.map((points, index) => {
          const id = index === 0 ? item.id : crypto.randomUUID();
          candidates.add(id);
          return { ...item, id, points };
        });
      });
    }
    gesture.last = next;
    if (publish) setAnnotations(gesture.current);
  }

  async function persistWipe(
    before: PageAnnotation[],
    after: PageAnnotation[],
  ) {
    setOperations((value) => value + 1);
    const changes: AnnotationHistoryEntry[] = [];
    const saved = new Map(before.map((item) => [item.id, item]));
    const originals = new Map(saved);
    const remaining = new Set(after.map((item) => item.id));
    const runBatch = async (
      items: PageAnnotation[],
      saveItem: (item: PageAnnotation) => Promise<void>,
    ) => {
      for (let offset = 0; offset < items.length; offset += 4) {
        const results = await Promise.allSettled(
          items.slice(offset, offset + 4).map(saveItem),
        );
        const failure = results.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
      }
    };
    try {
      // Save fragments first so a failed request cannot discard the remaining ink.
      await runBatch(
        after.filter((item) => !originals.has(item.id)),
        async (item) => {
          const result = await createTargetAnnotation(
            target,
            annotationCreateInput(item),
          );
          saved.set(result.id, result);
          changes.push({ target, before: null, after: result });
        },
      );
      await runBatch(
        after.filter(
          (item) => originals.has(item.id) && originals.get(item.id) !== item,
        ),
        async (item) => {
          const original = originals.get(item.id)!;
          const result = await updateTargetAnnotation(target, item.id, {
            points: item.points,
            revision: original.revision,
          });
          saved.set(result.id, result);
          changes.push({ target, before: original, after: result });
        },
      );
      await runBatch(
        before.filter((item) => !remaining.has(item.id)),
        async (item) => {
          await deleteTargetAnnotation(target, item.id);
          saved.delete(item.id);
          changes.push({ target, before: item, after: null });
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Erasing could not be completed. Undo to restore the stroke, then try again.",
      );
    } finally {
      setAnnotations(sorted([...saved.values()]));
      if (changes.length)
        onCommit?.({ target, before: null, after: null, changes });
      setOperations((value) => Math.max(0, value - 1));
    }
  }

  async function erase(
    annotation: PageAnnotation,
    event: ReactPointerEvent<Element>,
  ) {
    if (
      tool !== "eraser" ||
      eraserMode !== "stroke" ||
      disabled ||
      loading ||
      operations > 0 ||
      event.button !== 0 ||
      erasing.current.has(annotation.id)
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    erasing.current.add(annotation.id);
    setAnnotations((items) =>
      items.filter((item) => item.id !== annotation.id),
    );
    setOperations((value) => value + 1);
    setError(null);
    try {
      await deleteTargetAnnotation(target, annotation.id);
      setSelectedId((current) => (current === annotation.id ? null : current));
      onCommit?.({ target, before: annotation, after: null });
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
  const renderedAnnotations = annotations.map((annotation) =>
    moveDraft?.id === annotation.id ? moveDraft : annotation,
  );
  const selected = renderedAnnotations.find(
    (annotation) => annotation.id === selectedId,
  );
  const selectionBounds = selected
    ? getAnnotationBounds(
        selected.points,
        Math.max(selected.width * 1.5, 0.006),
      )
    : null;
  const textDraftBounds = textDraft
    ? getAnnotationBounds(textDraft.points)
    : null;
  const textEditorFontSize = textDraft
    ? Math.max(12, textDraft.fontSize * pageHeight)
    : 16;

  return (
    <>
      <svg
        ref={svgRef}
        className={styles.layer}
        data-tool={tool}
        data-eraser-mode={eraserMode}
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
        onPointerLeave={() => setEraserCursor(null)}
      >
        {renderedAnnotations.map((annotation) => {
          if (annotation.kind === "text") return null;
          const path = cachedStrokePath(annotation.points);
          return (
            <g key={annotation.id}>
              <path
                className={styles.stroke}
                d={path}
                stroke={annotation.color}
                strokeWidth={annotation.width}
                opacity={annotation.opacity}
                pointerEvents={
                  tool === "eraser" && eraserMode === "stroke"
                    ? "stroke"
                    : "none"
                }
                onPointerDown={(event) => void erase(annotation, event)}
              />
              {annotation.kind === "pencil" ? (
                <path
                  className={styles.pencilGrain}
                  d={path}
                  stroke={annotation.color}
                  strokeWidth={annotation.width * 0.62}
                  strokeDasharray={`${annotation.width * 1.5} ${annotation.width * 0.85}`}
                  opacity={Math.min(1, annotation.opacity + 0.12)}
                  pointerEvents="none"
                />
              ) : null}
              {tool === "select" ? (
                <path
                  className={styles.hitArea}
                  d={path}
                  strokeWidth={Math.max(annotation.width, 0.025)}
                  onPointerDown={(event) => beginMove(annotation, event)}
                />
              ) : null}
            </g>
          );
        })}
        {tool === "select" && selectionBounds ? (
          <rect
            className={styles.selection}
            x={selectionBounds.x}
            y={selectionBounds.y}
            width={selectionBounds.width}
            height={selectionBounds.height}
          />
        ) : null}
        {pending.map((item) => {
          if (item.kind === "text") return null;
          const path = cachedStrokePath(item.points);
          return (
            <g key={item.id}>
              <path
                className={styles.stroke}
                d={path}
                stroke={item.color}
                strokeWidth={item.width}
                opacity={item.opacity}
                pointerEvents="none"
              />
              {item.kind === "pencil" ? (
                <path
                  className={styles.pencilGrain}
                  d={path}
                  stroke={item.color}
                  strokeWidth={item.width * 0.62}
                  strokeDasharray={`${item.width * 1.5} ${item.width * 0.85}`}
                  opacity={Math.min(1, item.opacity + 0.12)}
                  pointerEvents="none"
                />
              ) : null}
            </g>
          );
        })}
        {draft && draft.points.length > 1 ? (
          <g>
            <path
              className={styles.draft}
              d={pointsToSvgPath(draft.points)}
              stroke={draft.color}
              strokeWidth={draft.width}
              opacity={draft.opacity}
            />
            {draft.kind === "pencil" ? (
              <path
                className={styles.pencilGrain}
                d={pointsToSvgPath(draft.points)}
                stroke={draft.color}
                strokeWidth={draft.width * 0.62}
                strokeDasharray={`${draft.width * 1.5} ${draft.width * 0.85}`}
                opacity={Math.min(1, draft.opacity + 0.12)}
                pointerEvents="none"
              />
            ) : null}
          </g>
        ) : null}
        {tool === "eraser" && eraserMode !== "stroke" && eraserCursor ? (
          <ellipse
            cx={eraserCursor.x}
            cy={eraserCursor.y}
            rx={eraserCursor.rx}
            ry={eraserCursor.ry}
            fill="none"
            stroke="#173f5f"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        ) : null}
      </svg>
      {renderedAnnotations.map((annotation) => {
        if (annotation.kind !== "text") return null;
        const bounds = getAnnotationBounds(annotation.points);
        return (
          <div
            key={annotation.id}
            className={styles.textAnnotation}
            style={{
              left: `${bounds.x * 100}%`,
              top: `${bounds.y * 100}%`,
              width: `${bounds.width * 100}%`,
              height: `${bounds.height * 100}%`,
              color: annotation.color,
              fontSize: `${Math.max(
                12,
                (annotation.font_size ?? defaultTextFontSize) * pageHeight,
              )}px`,
              opacity: annotation.opacity,
              pointerEvents:
                tool === "select" ||
                (tool === "eraser" && eraserMode === "stroke")
                  ? "auto"
                  : "none",
            }}
            onPointerDown={(event) => {
              if (tool === "eraser") void erase(annotation, event);
              else beginMove(annotation, event);
            }}
            onDoubleClick={(event) => {
              if (tool !== "select" || disabled || operations > 0) return;
              event.preventDefault();
              event.stopPropagation();
              setTextDraft({
                annotation,
                points: annotation.points,
                text: annotation.text_content ?? "",
                color: annotation.color,
                fontSize: annotation.font_size ?? defaultTextFontSize,
              });
            }}
          >
            {annotation.text_content}
          </div>
        );
      })}
      {pending.map((item) => {
        if (item.kind !== "text") return null;
        const bounds = getAnnotationBounds(item.points);
        return (
          <div
            key={item.id}
            className={styles.textAnnotation}
            style={{
              left: `${bounds.x * 100}%`,
              top: `${bounds.y * 100}%`,
              width: `${bounds.width * 100}%`,
              height: `${bounds.height * 100}%`,
              color: item.color,
              fontSize: `${Math.max(
                12,
                (item.fontSize ?? defaultTextFontSize) * pageHeight,
              )}px`,
              opacity: item.opacity,
              pointerEvents: "none",
            }}
          >
            {item.text}
          </div>
        );
      })}
      {textDraft && textDraftBounds ? (
        <textarea
          ref={textEditorRef}
          className={styles.textEditor}
          autoFocus
          maxLength={2000}
          aria-label="Text annotation"
          placeholder="Type here"
          value={textDraft.text}
          style={{
            left: `${textDraftBounds.x * 100}%`,
            top: `${textDraftBounds.y * 100}%`,
            width: `${textDraftBounds.width * 100}%`,
            height: `${textDraftBounds.height * 100}%`,
            color: textDraft.color,
            fontSize: `${textEditorFontSize}px`,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) =>
            setTextDraft((current) =>
              current ? { ...current, text: event.target.value } : current,
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              setTextDraft(null);
            } else if (
              event.key === "Enter" &&
              (event.ctrlKey || event.metaKey)
            ) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          onBlur={() => void commitText(textDraft)}
        />
      ) : null}
      {error || failed.length ? (
        <div className={styles.error}>
          <span role="alert">
            {failed.length
              ? "The unsaved annotation is kept on this page. Retry before leaving."
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
