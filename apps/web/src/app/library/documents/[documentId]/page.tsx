import { notFound, redirect } from "next/navigation";

import { PdfReader } from "@/features/reader/pdf-reader";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "PDF Reader", referrer: "no-referrer" };

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) redirect("/auth/sign-in");

  const { documentId } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      documentId,
    )
  ) {
    notFound();
  }

  return <PdfReader key={documentId} documentId={documentId} />;
}
