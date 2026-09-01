import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { LibraryWorkspace } from "@/features/library/library-workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Library" };

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ notebook?: string }>;
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
  const initialNotebookId =
    typeof query.notebook === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      query.notebook,
    )
      ? query.notebook
      : "";

  return (
    <LibraryWorkspace
      displayName={profile?.display_name ?? "Student"}
      initialNotebookId={initialNotebookId}
      signOutAction={signOut}
    />
  );
}
