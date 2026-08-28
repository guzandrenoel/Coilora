"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithMessage(
  pathname: string,
  kind: "error" | "message",
  message: string,
): never {
  const searchParams = new URLSearchParams({ [kind]: message });
  redirect(`${pathname}?${searchParams.toString()}`);
}

export async function signIn(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");

  if (!emailPattern.test(email) || password.length === 0) {
    redirectWithMessage(
      "/auth/sign-in",
      "error",
      "Enter a valid email address and password.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage(
      "/auth/sign-in",
      "error",
      "The email or password is incorrect.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/library");
}

export async function signUp(formData: FormData) {
  const firstName = readField(formData, "firstName");
  const lastName = readField(formData, "lastName");
  const displayName = `${firstName} ${lastName}`.trim();
  const email = readField(formData, "email").toLowerCase();
  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (
    firstName.length === 0 ||
    lastName.length === 0 ||
    displayName.length > 80
  ) {
    redirectWithMessage(
      "/auth/sign-up",
      "error",
      "Enter your first and last name. Together they cannot exceed 80 characters.",
    );
  }

  if (!emailPattern.test(email)) {
    redirectWithMessage(
      "/auth/sign-up",
      "error",
      "Enter a valid email address.",
    );
  }

  if (password.length < 8) {
    redirectWithMessage(
      "/auth/sign-up",
      "error",
      "Create a password containing at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirectWithMessage(
      "/auth/sign-up",
      "error",
      "The passwords do not match.",
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!appUrl) {
    redirectWithMessage(
      "/auth/sign-up",
      "error",
      "Account creation is temporarily unavailable.",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        first_name: firstName,
        last_name: lastName,
      },
      emailRedirectTo: `${appUrl}/auth/callback?next=/library`,
    },
  });

  if (error) {
    redirectWithMessage(
      "/auth/sign-up",
      "error",
      "We could not create your account. Please try again.",
    );
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/library");
  }

  redirectWithMessage(
    "/auth/sign-up",
    "message",
    "Check your email to confirm your Coilora account.",
  );
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    redirectWithMessage(
      "/library",
      "error",
      "We could not sign you out. Please try again.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}