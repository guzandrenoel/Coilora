import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { isLibraryId } from "@/features/library/library-view";
import { LibraryWorkspace } from "@/features/library/library-workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    notebook?: string | string[];
    course?: string | string[];
    view?: string | string[];
    target?: string | string[];
  }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const query = await searchParams;
  const notebookId = typeof query.notebook === "string" ? query.notebook : "";
  const courseId = typeof query.course === "string" ? query.course : "";
  const view = typeof query.view === "string" ? query.view : "";
  const targetNotebookId =
    typeof query.target === "string" ? query.target : "";
  const validCourseId =
    courseId === "uncategorized" || isLibraryId(courseId);
  const invalidRoute =
    (query.notebook !== undefined && !isLibraryId(notebookId)) ||
    (query.course !== undefined && !validCourseId) ||
    (query.view !== undefined && view !== "import") ||
    (query.target !== undefined && !isLibraryId(targetNotebookId)) ||
    (notebookId !== "" &&
      (courseId !== "" || view !== "" || targetNotebookId !== "")) ||
    (courseId !== "" && (view !== "" || targetNotebookId !== "")) ||
    (targetNotebookId !== "" && view !== "import");

  if (invalidRoute) redirect("/library");

  return (
    <LibraryWorkspace
      displayName={profile?.display_name ?? "Student"}
      initialCourseId={courseId}
      initialImportNotebookId={targetNotebookId}
      initialNotebookId={notebookId}
      initialView={view === "import" ? "import" : "notebooks"}
      signOutAction={signOut}
    />
  );
}
