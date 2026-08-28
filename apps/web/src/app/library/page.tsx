import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { MaterialImport } from "@/features/materials/material-import";
import { createClient } from "@/lib/supabase/server";

import styles from "./library.module.css";

export const metadata = {
  title: "Library",
};

const studyFlow = ["Import", "Annotate", "Highlight", "Understand", "Practice", "Review"];

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/auth/sign-in");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  const displayName = profile?.display_name ?? "Student";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#library-content">
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <Link className={styles.sidebarBrand} href="/" aria-label="Coilora home">
          <Image src="/brand/coilora-mark.png" width={72} height={72} alt="" priority />
          <span>Coilora</span>
        </Link>

        <nav className={styles.sidebarNav} aria-label="Workspace navigation">
          <p>Workspace</p>
          <Link className={styles.activeNavItem} href="/library" aria-current="page">
            <span aria-hidden="true">L</span>
            Library
          </Link>
          <Link href="/">
            <span aria-hidden="true">O</span>
            Overview
          </Link>
        </nav>

        <div className={styles.sidebarAccount}>
          <div className={styles.avatar} aria-hidden="true">
            {initial}
          </div>
          <div className={styles.accountCopy}>
            <strong>{displayName}</strong>
            <span>Private workspace</span>
          </div>
          <form action={signOut}>
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <main className={styles.workspace} id="library-content">
        <header className={styles.topbar}>
          <div>
            <p>Coilora workspace</p>
            <span>Your source-grounded study library</span>
          </div>
          <div className={styles.privacyStatus}>
            <span aria-hidden="true" />
            Private
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.welcome}>
            <div>
              <p>Welcome back</p>
              <h1>{displayName}&apos;s library</h1>
              <span>
                Start with the material you already have. Coilora will keep each study step
                connected to its source.
              </span>
            </div>

            <div className={styles.flowSummary} aria-label="Coilora study flow">
              {studyFlow.map((step, index) => (
                <div key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.workspaceGrid}>
            <section className={styles.materialsArea} aria-labelledby="materials-title">
              <header className={styles.sectionHeader}>
                <div>
                  <p>Your materials</p>
                  <h2 id="materials-title">Start from a source</h2>
                </div>
                <span>Local preparation</span>
              </header>
              <MaterialImport />
            </section>

            <aside className={styles.detailsColumn}>
              <section className={styles.infoPanel} aria-labelledby="study-flow-title">
                <p>Study flow</p>
                <h2 id="study-flow-title">One connected workspace</h2>
                <ol>
                  {studyFlow.map((step, index) => (
                    <li key={step}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </section>

              <section className={styles.readinessPanel} aria-labelledby="readiness-title">
                <p>Current foundation</p>
                <h2 id="readiness-title">Before secure uploads</h2>
                <span>
                  File checks run in the browser. Private storage, extraction, and indexing will be
                  connected through the backend.
                </span>
                <dl>
                  <div>
                    <dt>Source files</dt>
                    <dd>Remain unchanged</dd>
                  </div>
                  <div>
                    <dt>Selection limit</dt>
                    <dd>50 MB per file</dd>
                  </div>
                  <div>
                    <dt>Upload status</dt>
                    <dd>Not connected yet</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
