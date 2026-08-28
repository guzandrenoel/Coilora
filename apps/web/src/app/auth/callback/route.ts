import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeDestination(value: string | null) {
  if (value?.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return "/library";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = getSafeDestination(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const isPasswordRecovery = next === "/auth/update-password";
  const pathname = isPasswordRecovery
    ? "/auth/forgot-password"
    : "/auth/sign-in";
  const message = isPasswordRecovery
    ? "This reset link is invalid or has expired. Request a new one."
    : "This confirmation link is invalid or has expired.";
  const searchParams = new URLSearchParams({ error: message });

  return NextResponse.redirect(
    new URL(`${pathname}?${searchParams.toString()}`, request.url),
  );
}