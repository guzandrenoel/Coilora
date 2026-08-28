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

export async function requestPasswordReset(formData: FormData) {
  const email = readField(formData, "email").toLowerCase();

  if (!emailPattern.test(email)) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "Enter a valid email address.",
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (!appUrl) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "Password recovery is temporarily unavailable.",
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "We could not send a reset email. Please try again.",
    );
  }

  redirectWithMessage(
    "/auth/forgot-password",
    "message",
    "If an account exists for that email, a password reset link has been sent.",
  );
}

export async function updatePassword(formData: FormData) {
  const password = readField(formData, "password");
  const confirmPassword = readField(formData, "confirmPassword");

  if (password.length < 8) {
    redirectWithMessage(
      "/auth/update-password",
      "error",
      "Create a password containing at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirectWithMessage(
      "/auth/update-password",
      "error",
      "The passwords do not match.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirectWithMessage(
      "/auth/forgot-password",
      "error",
      "This reset link is invalid or has expired. Request a new one.",
    );
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithMessage(
      "/auth/update-password",
      "error",
      "We could not update your password. Please request a new reset link.",
    );
  }

  await supabase.auth.signOut();
  revalidatePath("/", "layout");

  redirectWithMessage(
    "/auth/sign-in",
    "message",
    "Your password has been updated. Sign in with your new password.",
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