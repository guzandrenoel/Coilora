import { notFound, redirect } from "next/navigation";

import { NotebookPageEditor } from "@/features/editor/notebook-page-editor";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Notebook Page",
  referrer: "no-referrer",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NotebookPage({
  params,
}: {
  params: Promise<{ notebookId: string; pageId: string }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/auth/sign-in");
  }

  const { notebookId, pageId } = await params;

  if (!uuidPattern.test(notebookId) || !uuidPattern.test(pageId)) {
    notFound();
  }

  return (
    <NotebookPageEditor
      key={pageId}
      notebookId={notebookId}
      pageId={pageId}
    />
  );
}