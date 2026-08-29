import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import {
  HighlighterIcon,
  HomeIcon,
  LibraryIcon,
  LockIcon,
  LogOutIcon,
  PenIcon,
  PracticeIcon,
  ReviewIcon,
  SparkIcon,
  UploadIcon,
} from "@/components/ui/icons";
import { ApiIdentityStatus } from "@/features/auth/api-identity-status";
import { LibraryCollections } from "@/features/library/library-collections";
import { MaterialImport } from "@/features/materials/material-import";
import { createClient } from "@/lib/supabase/server";

import styles from "./library.module.css";

export const metadata = {
  title: "Library",
};

const studyFlow = [
  { name: "Import", icon: UploadIcon, tone: "mint" },
  { name: "Annotate", icon: PenIcon, tone: "blue" },
  { name: "Highlight", icon: HighlighterIcon, tone: "yellow" },
  { name: "Understand", icon: SparkIcon, tone: "lilac" },
  { name: "Practice", icon: PracticeIcon, tone: "coral" },
  { name: "Review", icon: ReviewIcon, tone: "mint" },
] as const;

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
  const firstName = displayName.split(" ")[0] ?? displayName;
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className={styles.page}>
      <a className="skip-link" href="#library-content">
        Skip to content
      </a>

      <aside className={styles.sidebar}>
        <Link className={styles.sidebarBrand} href="/" aria-label="Coilora home">
          <span className={styles.brandMark}>
            <Image src="/brand/coilora-mark.png" width={96} height={96} alt="" priority />
          </span>
          <span>Coilora</span>
        </Link>

        <nav className={styles.sidebarNav} aria-label="Workspace navigation">
          <p>Workspace</p>
          <Link className={styles.activeNavItem} href="/library" aria-current="page">
            <LibraryIcon />
            <span>Library</span>
          </Link>
          <Link href="/">
            <HomeIcon />
            <span>Overview</span>
          </Link>
        </nav>

        <div className={styles.sidebarTip}>
          <SparkIcon />
          <p>Every note stays connected to the source it came from.</p>
        </div>

        <div className={styles.sidebarAccount}>
          <div className={styles.accountIdentity}>
            <div className={styles.avatar} aria-hidden="true">{initial}</div>
            <div className={styles.accountCopy}>
              <strong>{displayName}</strong>
              <span>Personal workspace</span>
            </div>
          </div>
          <form action={signOut}>
            <button type="submit">
              <LogOutIcon />
              <span>Sign out</span>
            </button>
          </form>
        </div>
      </aside>

      <main className={styles.workspace} id="library-content">
        <header className={styles.topbar}>
          <div>
            <LibraryIcon />
            <span>Library</span>
          </div>
          <a className={styles.importAction} href="#material-import-title">
            <UploadIcon />
            Import material
          </a>
        </header>

        <div className={styles.content}>
          <header className={styles.libraryHeader}>
            <div>
              <p>Welcome back, {firstName}</p>
              <h1>Your library</h1>
              <span>Bring in a source and keep the whole study process in one calm workspace.</span>
            </div>
          </header>

          <section className={styles.flowRail} aria-label="Coilora study flow">
            {studyFlow.map(({ name, icon: StepIcon, tone }) => (
              <div className={styles[tone]} key={name}>
                <span><StepIcon /></span>
                <strong>{name}</strong>
              </div>
            ))}
          </section>

          <LibraryCollections />

          <div className={styles.workspaceGrid}>
            <section className={styles.materialsArea} aria-labelledby="materials-title">
              <header className={styles.sectionHeader}>
                <div>
                  <p>Study materials</p>
                  <h2 id="materials-title">Add your first source</h2>
                </div>
                <span>PDF, images, and notes</span>
              </header>
              <MaterialImport />
            </section>

            <aside className={styles.detailsColumn}>
              <section className={styles.guidePanel} aria-labelledby="guide-title">
                <div className={styles.panelIcon}><SparkIcon /></div>
                <h2 id="guide-title">Start small</h2>
                <p>Choose one useful lecture or note. You can organize it after the upload workflow is connected.</p>
                <ol>
                  <li><span>1</span><div><strong>Choose a source</strong><small>PDF, image, text, or Markdown</small></div></li>
                  <li><span>2</span><div><strong>Check the file</strong><small>Coilora validates it locally</small></div></li>
                  <li><span>3</span><div><strong>Keep studying</strong><small>Your source stays unchanged</small></div></li>
                </ol>
              </section>

              <section className={styles.securityPanel} aria-labelledby="security-title">
                <LockIcon />
                <div>
                  <h2 id="security-title">Private by default</h2>
                  <p>Your account is verified through the secure Coilora API.</p>
                  <ApiIdentityStatus />
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
