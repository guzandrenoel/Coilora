"use client";
import { NotebookViewer } from "@/features/notebook/notebook-viewer";
import { noteKey } from "@/features/notebook/notebook-timeline";

export function NotebookPageEditor({
  notebookId,
  pageId,
}: {
  notebookId: string;
  pageId: string;
}) {
  return (
    <NotebookViewer
      key={notebookId}
      notebookId={notebookId}
      initialKey={noteKey(pageId)}
    />
  );
}
