import Link from "next/link";

import { requestPasswordReset } from "@/app/auth/actions";

import styles from "../auth.module.css";

export const metadata = {
  title: "Forgot password",
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const { error, message } = await searchParams;

  return (
    <div
      className={styles.formContainer}
      aria-labelledby="forgot-password-title"
    >
      <p className={styles.eyebrow}>Account recovery</p>
      <h2 id="forgot-password-title">Reset your password</h2>
      <p className={styles.summary}>
        Enter your email address and we will send you a secure reset link.
      </p>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}

      {message ? (
        <p className={styles.successMessage} role="status">
          {message}
        </p>
      ) : null}

      <form className={styles.form} action={requestPasswordReset}>
        <label className={styles.field}>
          <span>Email address</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>

        <button className={styles.submitButton} type="submit">
          Send reset link
        </button>
      </form>

      <p className={styles.switchPrompt}>
        Remember your password? <Link href="/auth/sign-in">Sign in</Link>
      </p>
    </div>
  );
}