import Image from "next/image";
import Link from "next/link";

import { StudyFlowPreview } from "@/features/marketing/study-flow-preview";

import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Coilora home">
          <Image src="/brand/coilora-mark.png" width={64} height={64} priority alt="" />
          <span>Coilora</span>
        </Link>

        <nav className={styles.navigation} aria-label="Primary navigation">
          <a href="#workflow">Workflow</a>
          <a href="#principles">Principles</a>
        </nav>

        <div className={styles.headerActions}>
          <Link className={styles.signInLink} href="/auth/sign-in">
            Sign in
          </Link>
          <Link className={styles.headerButton} href="/library">
            Open Coilora
          </Link>
        </div>
      </header>

      <section className={styles.hero} id="main-content">
        <p className={styles.eyebrow}>A source-grounded study workspace</p>
        <h1>Shed the overload. Keep what matters.</h1>
        <p className={styles.heroSummary}>
          Read, annotate, understand, and review medical study materials without losing the
          connection to your original sources.
        </p>
        <div className={styles.heroActions}>
          <Link className={styles.primaryButton} href="/library">
            Open your workspace
          </Link>
          <a className={styles.secondaryButton} href="#workflow">
            Explore the workflow
          </a>
        </div>

        <StudyFlowPreview />
      </section>

      <section className={styles.workflowSection} id="workflow" aria-labelledby="workflow-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>One continuous learning loop</p>
          <h2 id="workflow-title">Built around how students actually study.</h2>
          <p>
            Coilora combines a focused notebook experience with a source-grounded study workspace.
            Each stage stays connected instead of becoming another separate tool.
          </p>
        </div>

        <div className={styles.featureRows}>
          <article className={styles.featureRow}>
            <div className={styles.featureCopy}>
              <span>01 · Work with the source</span>
              <h3>Read and annotate without leaving the material.</h3>
              <p>
                Keep lecture files, handwritten notes, highlights, and page context together while
                the original upload remains unchanged.
              </p>
            </div>
            <div className={styles.annotationVisual} aria-hidden="true">
              <div className={styles.annotationToolbar}>
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className={styles.annotationPage}>
                <div />
                <div />
                <mark />
                <div />
                <div />
              </div>
            </div>
          </article>

          <article className={[styles.featureRow, styles.featureRowReverse].join(" ")}>
            <div className={styles.featureCopy}>
              <span>02 · Keep answers traceable</span>
              <h3>Understand difficult topics with the source still in view.</h3>
              <p>
                Explanations and suggested highlights retain page references so students can verify
                context instead of trusting disconnected output.
              </p>
            </div>
            <div className={styles.citationVisual} aria-hidden="true">
              <div className={styles.citationSource}>
                <span>Lecture 04</span>
                <strong>Page 12</strong>
              </div>
              <div className={styles.citationAnswer}>
                <span>Grounded explanation</span>
                <div />
                <div />
                <small>View source</small>
              </div>
            </div>
          </article>

          <article className={styles.featureRow}>
            <div className={styles.featureCopy}>
              <span>03 · Turn notes into recall</span>
              <h3>Move from understanding to practice in the same workspace.</h3>
              <p>
                Selected material can become editable flashcards, questions, and review items while
                preserving where each idea came from.
              </p>
            </div>
            <div className={styles.practiceVisual} aria-hidden="true">
              <div className={styles.practiceCard}>
                <span>Question</span>
                <strong>What initiates ventricular contraction?</strong>
              </div>
              <div className={styles.practiceQueue}>
                <span>Today</span>
                <strong>18 review items</strong>
                <div />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className={styles.principlesSection} id="principles" aria-labelledby="principles-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Trust by design</p>
          <h2 id="principles-title">Your sources and decisions stay visible.</h2>
        </div>
        <div className={styles.principleGrid}>
          <article>
            <span>Originals stay intact</span>
            <p>Uploaded source files are preserved instead of silently rewritten.</p>
          </article>
          <article>
            <span>Suggestions need approval</span>
            <p>Suggested highlights remain previews until the student accepts them.</p>
          </article>
          <article>
            <span>Citations stay attached</span>
            <p>Explanations and study items keep a path back to the source page.</p>
          </article>
          <article>
            <span>Private by default</span>
            <p>Account ownership is enforced by the server and database policies.</p>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <p className={styles.eyebrow}>Coilora web preview</p>
        <h2>Start with the material in front of you.</h2>
        <p>Build a calmer path from lecture notes to lasting recall.</p>
        <Link className={styles.primaryButton} href="/library">
          Open Coilora
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/" aria-label="Coilora home">
          <Image src="/brand/coilora-mark.png" width={52} height={52} alt="" />
          <span>Coilora</span>
        </Link>
        <p>Shed the overload. Keep what matters.</p>
        <div>
          <Link href="/auth/sign-in">Sign in</Link>
          <Link href="/library">Library</Link>
        </div>
      </footer>
    </main>
  );
}
