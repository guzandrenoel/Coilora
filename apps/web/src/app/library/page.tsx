import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { LibraryWorkspace } from "@/features/library/library-workspace";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return (
    <LibraryWorkspace
      displayName={profile?.display_name ?? "Student"}
      signOutAction={signOut}
    />
  );
}
