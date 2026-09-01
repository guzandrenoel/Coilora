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
  AnnotationPoint,
  PageAnnotation,
} from "@/lib/api/types";
import {
  getNormalizedPoint,
  pointsToSvgPath,
  shouldAppendPoint,
} from "./annotation-geometry";
import styles from "./annotation-canvas.module.css";

export type EditorTool = AnnotationKind | "eraser";

type PendingStroke = {
  id: string;
  kind: AnnotationKind;
  points: AnnotationPoint[];
  color: string;
  width: number;
  opacity: number;
};

const toolSettings: Record<
  AnnotationKind,
  { width: number; opacity: number }
> = {
  ink: {
    width: 0.004,
    opacity: 1,
  },
  highlight: {
    width: 0.03,
    opacity: 0.35,
  },
};

function sortAnnotations(
  annotations: PageAnnotation[],
) {
  return [...annotations].sort(
    (first, second) =>
      first.z_index - second.z_index,
  );
}

export function AnnotationCanvas({
  notebookId,
  pageId,
  documentId,
  documentPageNumber,
  tool,
  color,
}: {
  notebookId?: string;
  pageId?: string;
  documentId?: string;
  documentPageNumber?: number;
  tool: EditorTool;
  color: string;
}) {
  const [annotations, setAnnotations] = useState<
    PageAnnotation[]
  >([]);
  const [draft, setDraft] = useState<
    AnnotationPoint[] | null
  >(null);
  const [pendingStrokes, setPendingStrokes] = useState<PendingStroke[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingOperations, setPendingOperations] =
    useState(0);
  const [error, setError] = useState<string | null>(
    null,
  );

  const activePointer = useRef<number | null>(null);
  const draftPoints = useRef<AnnotationPoint[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnotations() {
      setLoading(true);
      setError(null);
      setAnnotations([]);
      setPendingStrokes([]);

      try {
        const loaded: PageAnnotation[] = [];
        let nextPage: number | null = 0;

        while (nextPage !== null) {
          const result: {
            items: PageAnnotation[];
            nextPage: number | null;
          } =
            documentId !== undefined && documentPageNumber !== undefined
              ? await getDocumentPageAnnotations(
                  documentId,
                  documentPageNumber,
                  nextPage,
                )
              : await getPageAnnotations(
                  notebookId ?? "",
                  pageId ?? "",
                  nextPage,
                );

          loaded.push(...result.items);
          nextPage = result.nextPage;
        }

        if (!cancelled) {
          setAnnotations(sortAnnotations(loaded));
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Annotations could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnnotations();

    return () => {
      cancelled = true;
    };
  }, [documentId, documentPageNumber, notebookId, pageId]);

  function getPoint(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    return getNormalizedPoint(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
  }

  function beginStroke(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    if (
      tool === "eraser" ||
      loading ||
      event.button !== 0
    ) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    const point = getPoint(event);

    activePointer.current = event.pointerId;
    draftPoints.current = [point];
    setDraft([point]);
  }

  function continueStroke(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    if (
      activePointer.current !== event.pointerId ||
      tool === "eraser"
    ) {
      return;
    }

    event.preventDefault();

    const point = getPoint(event);

    if (
      draftPoints.current.length >= 4096 ||
      !shouldAppendPoint(
        draftPoints.current,
        point,
      )
    ) {
      return;
    }

    draftPoints.current = [
      ...draftPoints.current,
      point,
    ];

    setDraft(draftPoints.current);
  }

  async function finishStroke(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    if (
      activePointer.current !== event.pointerId ||
      tool === "eraser"
    ) {
      return;
    }

    event.preventDefault();

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    const point = getPoint(event);

    if (
      draftPoints.current.length < 4096 &&
      shouldAppendPoint(
        draftPoints.current,
        point,
        0.0001,
      )
    ) {
      draftPoints.current = [
        ...draftPoints.current,
        point,
      ];
    }

    const completedPoints = draftPoints.current;

    activePointer.current = null;
    draftPoints.current = [];
    setDraft(null);

    if (completedPoints.length < 2) {
     return;
    }

    const settings = toolSettings[tool];
    const pendingId = crypto.randomUUID();
    const pendingStroke: PendingStroke = {
      id: pendingId,
      kind: tool,
      points: completedPoints,
      color,
      width: settings.width,
      opacity: settings.opacity,
    };

    setPendingStrokes((current) => [...current, pendingStroke]);
    setPendingOperations((current) => current + 1);
    setError(null);

    try {
      const input = {
        kind: tool,
        points: completedPoints,
        color,
        width: settings.width,
        opacity: settings.opacity,
      };
      const created =
        documentId !== undefined && documentPageNumber !== undefined
          ? await createDocumentPageAnnotation(
              documentId,
              documentPageNumber,
              input,
            )
          : await createPageAnnotation(
              notebookId ?? "",
              pageId ?? "",
              input,
            );

      setAnnotations((current) =>
        sortAnnotations([...current, created]),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The annotation could not be saved.",
      );
    } finally {
      setPendingStrokes((current) =>
        current.filter((stroke) => stroke.id !== pendingId),
      );
      setPendingOperations((current) =>
        Math.max(0, current - 1),
      );
    }
  }

  function cancelStroke(
    event: ReactPointerEvent<SVGSVGElement>,
  ) {
    if (
      activePointer.current !== event.pointerId
    ) {
      return;
    }

    activePointer.current = null;
    draftPoints.current = [];
    setDraft(null);
  }

  async function eraseAnnotation(
    annotation: PageAnnotation,
    event: ReactPointerEvent<SVGPathElement>,
  ) {
    if (tool !== "eraser") return;

    event.preventDefault();
    event.stopPropagation();

    setAnnotations((current) =>
      current.filter(
        (item) => item.id !== annotation.id,
      ),
    );
    setPendingOperations((current) => current + 1);
    setError(null);

    try {
      if (documentId !== undefined && documentPageNumber !== undefined) {
        await deleteDocumentPageAnnotation(
          documentId,
          documentPageNumber,
          annotation.id,
        );
      } else {
        await deletePageAnnotation(
          notebookId ?? "",
          pageId ?? "",
          annotation.id,
        );
      }
    } catch (reason) {
      setAnnotations((current) =>
        sortAnnotations([...current, annotation]),
      );
      setError(
        reason instanceof Error
          ? reason.message
          : "The annotation could not be erased.",
      );
    } finally {
      setPendingOperations((current) =>
        Math.max(0, current - 1),
      );
    }
  }

  const draftKind =
    tool === "eraser" ? "ink" : tool;
  const draftSettings = toolSettings[draftKind];

  return (
    <>
      <svg
        className={styles.layer}
        data-tool={tool}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        role="img"
        aria-label="Notebook annotation canvas"
        aria-busy={loading || pendingOperations > 0}
        onPointerDown={beginStroke}
        onPointerMove={continueStroke}
        onPointerUp={(event) =>
          void finishStroke(event)
        }
        onPointerCancel={cancelStroke}
      >
        {annotations.map((annotation) => (
          <path
            className={styles.stroke}
            key={annotation.id}
            d={pointsToSvgPath(annotation.points)}
            stroke={annotation.color}
            strokeWidth={annotation.width}
            opacity={annotation.opacity}
            pointerEvents={
              tool === "eraser" ? "stroke" : "none"
            }
            onPointerDown={(event) =>
              void eraseAnnotation(annotation, event)
            }
          />
        ))}

        {pendingStrokes.map((stroke) => (
          <path
            className={styles.stroke}
            key={stroke.id}
            d={pointsToSvgPath(stroke.points)}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            opacity={stroke.opacity}
            pointerEvents="none"
          />
        ))}

        {draft && draft.length > 1 ? (
          <path
            className={styles.draft}
            d={pointsToSvgPath(draft)}
            stroke={color}
            strokeWidth={draftSettings.width}
            opacity={draftSettings.opacity}
          />
        ) : null}
      </svg>

      {loading ? (
        <p className={styles.status} role="status">
          Loading annotations...
        </p>
      ) : pendingOperations > 0 ? (
        <p className={styles.status} role="status">
          Saving...
        </p>
      ) : null}

      {error ? (
        <div className={styles.error}>
          <span role="alert">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </>
  );
}
