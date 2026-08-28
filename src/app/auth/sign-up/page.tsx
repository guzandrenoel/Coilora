import Link from "next/link";

import { signUp } from "@/app/auth/actions";

import styles from "../auth.module.css";

export const metadata = {
  title: "Create account",
};

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps) {
  const { error, message } = await searchParams;

  return (
    <div className={styles.formContainer} aria-labelledby="sign-up-title">
      <p className={styles.eyebrow}>Create your workspace</p>
      <h2 id="sign-up-title">Start with Coilora</h2>
      <p className={styles.summary}>
        Create an account for your private study materials and progress.
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

      <form className={styles.form} action={signUp}>
        <div className={styles.nameFields}>
          <label className={styles.field}>
            <span>First name</span>
            <input
              name="firstName"
              type="text"
              autoComplete="given-name"
              maxLength={60}
              required
            />
          </label>

          <label className={styles.field}>
            <span>Last name</span>
            <input
              name="lastName"
              type="text"
              autoComplete="family-name"
              maxLength={60}
              required
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Email address</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>

        <label className={styles.field}>
          <span>Password</span>
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
          <span>Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </label>

        <button className={styles.submitButton} type="submit">
          Create account
        </button>
      </form>

      <p className={styles.switchPrompt}>
        Already have an account? <Link href="/auth/sign-in">Sign in</Link>
      </p>
    </div>
  );
}
