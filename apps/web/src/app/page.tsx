import Image from "next/image";
import Link from "next/link";

import {
  ArrowRightIcon,
  HighlighterIcon,
  LibraryIcon,
  PenIcon,
  PracticeIcon,
  ShieldCheckIcon,
  SparkIcon,
} from "@/components/ui/icons";
import { StudyFlowPreview } from "@/features/marketing/study-flow-preview";

import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Coilora home">
          <span className={styles.brandMark}>
            <Image src="/brand/coilora-mark.png" width={100} height={100} priority alt="" />
          </span>
          <span>Coilora</span>
        </Link>

        <nav className={styles.navigation} aria-label="Primary navigation">
          <a href="#workflow">How it works</a>
          <a href="#why-coilora">Why Coilora</a>
        </nav>

        <div className={styles.headerActions}>
          <Link className={styles.signInLink} href="/auth/sign-in">Sign in</Link>
          <Link className={styles.headerButton} href="/auth/sign-up">
            Get started <ArrowRightIcon />
          </Link>
        </div>
      </header>

      <section className={styles.hero} id="main-content">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Shed the overload. Keep what matters.</p>
          <h1>Your notes should help you think.</h1>
          <p className={styles.heroSummary}>
            Coilora keeps medical study materials, annotations, explanations, and practice tied to the source—so the path from reading to recall stays clear.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/auth/sign-up">
              Create your workspace <ArrowRightIcon />
            </Link>
            <a className={styles.secondaryButton} href="#workflow">See the study flow</a>
          </div>
          <div className={styles.heroTrust}>
            <ShieldCheckIcon />
            <span>Private by default · Sources remain unchanged</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.backSheet} />
          <div className={styles.studySheet}>
            <header><span>Cardiovascular systems</span><small>12 / 38</small></header>
            <h2>Cardiac conduction pathway</h2>
            <i className={styles.longLine} />
            <i className={styles.mediumLine} />
            <mark><i /><i /><i /></mark>
            <div className={styles.marginNote}>Why does the AV node delay the signal?</div>
          </div>
          <div className={styles.toolDock}>
            <span className={styles.activeTool}><PenIcon /></span>
            <span><HighlighterIcon /></span>
            <span><SparkIcon /></span>
          </div>
          <div className={styles.sourceCard}>
            <LibraryIcon />
            <div><strong>Source attached</strong><small>Lecture 04 · Page 12</small></div>
          </div>
        </div>
      </section>

      <section className={styles.workflowSection} id="workflow" aria-labelledby="workflow-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>One continuous study flow</p>
          <h2 id="workflow-title">Stay with the material from first read to final review.</h2>
          <p>Explore each stage below. The interface changes with the task while the source stays close by.</p>
        </div>
        <StudyFlowPreview />
      </section>

      <section className={styles.whySection} id="why-coilora" aria-labelledby="why-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>Designed for focused study</p>
          <h2 id="why-title">A notebook feel with research-grade traceability.</h2>
        </div>

        <div className={styles.benefitGrid}>
          <article className={styles.mintCard}>
            <span><LibraryIcon /></span>
            <h3>Everything starts from a source</h3>
            <p>Lectures, images, and notes stay organized as the foundation for every later study step.</p>
          </article>
          <article className={styles.yellowCard}>
            <span><HighlighterIcon /></span>
            <h3>Your thinking stays beside the page</h3>
            <p>Annotations and highlights keep their context instead of disappearing into a separate app.</p>
          </article>
          <article className={styles.lilacCard}>
            <span><SparkIcon /></span>
            <h3>Answers remain checkable</h3>
            <p>Explanations preserve a path back to the original material so you can verify what matters.</p>
          </article>
          <article className={styles.coralCard}>
            <span><PracticeIcon /></span>
            <h3>Understanding becomes recall</h3>
            <p>Practice and review stay connected to the exact idea and source that created them.</p>
          </article>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div>
          <p className={styles.eyebrow}>Your calmer study workspace</p>
          <h2>Bring one source. Build from there.</h2>
        </div>
        <Link className={styles.primaryButton} href="/auth/sign-up">
          Start with Coilora <ArrowRightIcon />
        </Link>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/" aria-label="Coilora home">
          <span className={styles.brandMark}>
            <Image src="/brand/coilora-mark.png" width={88} height={88} alt="" />
          </span>
          <span>Coilora</span>
        </Link>
        <p>Shed the overload. Keep what matters.</p>
        <div><Link href="/auth/sign-in">Sign in</Link><Link href="/library">Library</Link></div>
      </footer>
    </main>
  );
}
