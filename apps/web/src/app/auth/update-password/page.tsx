import Link from "next/link";
import { redirect } from "next/navigation";

import { updatePassword } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

import styles from "../auth.module.css";

export const metadata = {
  title: "Choose a new password",
};

type UpdatePasswordPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const params = new URLSearchParams({
      error: "Open the reset link from your email before choosing a new password.",
    });

    redirect(`/auth/forgot-password?${params.toString()}`);
  }

  return (
    <div
      className={styles.formContainer}
      aria-labelledby="update-password-title"
    >
      <p className={styles.eyebrow}>Secure your account</p>
      <h2 id="update-password-title">Choose a new password</h2>
      <p className={styles.summary}>
        Create a new password for your Coilora account.
      </p>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}

      <form className={styles.form} action={updatePassword}>
        <label className={styles.field}>
          <span>New password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <small>Use at least 8 characters.</small>
        </label>

        <label className={styles.field}>
          <span>Confirm new password</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <button className={styles.submitButton} type="submit">
          Update password
        </button>
      </form>

      <p className={styles.switchPrompt}>
        Return to <Link href="/auth/sign-in">sign in</Link>
      </p>
    </div>
  );
}