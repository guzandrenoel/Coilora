"use client";

import { createClient } from "@/lib/supabase/client";

export type ApiUser = {
  id: string;
  email: string | null;
};

function getApiUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  if (!apiUrl) {
    throw new Error("The Coilora API URL is not configured.");
  }

  return apiUrl;
}

function isApiUser(value: unknown): value is ApiUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    (typeof candidate.email === "string" || candidate.email === null)
  );
}

export async function getCurrentApiUser(): Promise<ApiUser> {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error("A signed-in session is required.");
  }

  const response = await fetch(`${getApiUrl()}/v1/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("The API could not verify the signed-in session.");
  }

  const body: unknown = await response.json();

  if (!isApiUser(body)) {
    throw new Error("The API returned an unexpected identity response.");
  }

  return body;
}