import Image from "next/image";
import Link from "next/link";

import { MaterialImport } from "@/features/materials/material-import";

import styles from "./library.module.css";

export const metadata = {
  title: "Library",
};

export default function LibraryPage() {
  return (
    <main className={styles.page}>
      <a className="skip-link" href="#library-content">
        Skip to content
      </a>

      <header className={styles.header}>
        <Link className="brand" href="/" aria-label="Coilora home">
          <Image src="/brand/coilora-mark.png" width={42} height={42} alt="" priority />
          <span>Coilora</span>
        </Link>
        <nav aria-label="Application navigation">
          <Link href="/">Overview</Link>
          <Link className="nav-action" href="/library" aria-current="page">
            Library
          </Link>
        </nav>
      </header>

      <div className={styles.content} id="library-content">
        <header className={styles.pageHeading}>
          <p>Study workspace</p>
          <h1>Library</h1>
          <span>Prepare the first materials that will become part of your Coilora workspace.</span>
        </header>

        <div className={styles.layout}>
          <MaterialImport />

          <aside className={styles.guidance} aria-labelledby="library-guidance-title">
            <p className={styles.asideLabel}>Current foundation</p>
            <h2 id="library-guidance-title">Before secure uploads</h2>
            <p>
              This first step validates files in the browser. Account ownership, private storage,
              malware scanning, extraction, and indexing will be connected through the backend.
            </p>

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
          </aside>
        </div>
      </div>
    </main>
  );
}
