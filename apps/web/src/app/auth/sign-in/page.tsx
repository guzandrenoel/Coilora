import Link from "next/link";

import { signIn } from "@/app/auth/actions";

import styles from "../auth.module.css";

export const metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const { error } = await searchParams;

  return (
    <div className={styles.formContainer} aria-labelledby="sign-in-title">
      <p className={styles.eyebrow}>Welcome back</p>
      <h2 id="sign-in-title">Sign in to Coilora</h2>
      <p className={styles.summary}>
        Continue where you left off in your study workflow.
      </p>

      {error ? (
        <p className={styles.errorMessage} role="alert">
          {error}
        </p>
      ) : null}

      <form className={styles.form} action={signIn}>
        <label className={styles.field}>
          <span>Email address</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>

        <button className={styles.submitButton} type="submit">
          Sign in
        </button>
      </form>

      <p className={styles.switchPrompt}>
        New to Coilora? <Link href="/auth/sign-up">Create an account</Link>
      </p>
    </div>
  );
}
