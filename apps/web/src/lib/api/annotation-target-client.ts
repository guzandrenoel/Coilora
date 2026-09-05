"use client";

import {
  createPageAnnotation,
  deletePageAnnotation,
  updatePageAnnotation,
} from "./annotations-client";
import {
  createDocumentPageAnnotation,
  deleteDocumentPageAnnotation,
  updateDocumentPageAnnotation,
} from "./document-annotations-client";
import type { CreateAnnotationInput, PageAnnotation } from "./types";

export type AnnotationTarget =
  | {
      kind: "notebook-page";
      key: string;
      notebookId: string;
      pageId: string;
    }
  | {
      kind: "document-page";
      key: string;
      documentId: string;
      pageNumber: number;
    };

export type AnnotationHistoryEntry = {
  target: AnnotationTarget;
  before: PageAnnotation | null;
  after: PageAnnotation | null;
};

export function annotationCreateInput(
  annotation: PageAnnotation,
): CreateAnnotationInput {
  return {
    id: annotation.id,
    kind: annotation.kind,
    points: annotation.points,
    color: annotation.color,
    width: annotation.width,
    opacity: annotation.opacity,
  };
}

export function createTargetAnnotation(
  target: AnnotationTarget,
  input: CreateAnnotationInput,
) {
  return target.kind === "notebook-page"
    ? createPageAnnotation(target.notebookId, target.pageId, input)
    : createDocumentPageAnnotation(target.documentId, target.pageNumber, input);
}

export async function deleteTargetAnnotation(
  target: AnnotationTarget,
  annotationId: string,
) {
  if (target.kind === "notebook-page") {
    await deletePageAnnotation(target.notebookId, target.pageId, annotationId);
    return;
  }
  await deleteDocumentPageAnnotation(
    target.documentId,
    target.pageNumber,
    annotationId,
  );
}

export function updateTargetAnnotation(
  target: AnnotationTarget,
  annotationId: string,
  points: PageAnnotation["points"],
  revision: number,
) {
  const input = { points, revision };
  return target.kind === "notebook-page"
    ? updatePageAnnotation(
        target.notebookId,
        target.pageId,
        annotationId,
        input,
      )
    : updateDocumentPageAnnotation(
        target.documentId,
        target.pageNumber,
        annotationId,
        input,
      );
}
