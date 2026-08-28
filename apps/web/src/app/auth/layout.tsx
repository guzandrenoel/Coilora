import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import styles from "./auth.module.css";

type AuthLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <section className={styles.context}>
        <Link className={styles.brand} href="/" aria-label="Coilora home">
          <Image
            src="/brand/coilora-mark.png"
            width={96}
            height={96}
            priority
            alt=""
          />
          <span>Coilora</span>
        </Link>

        <div className={styles.contextCopy}>
          <p>Built for focused study</p>
          <h1>Shed the overload. Keep what matters.</h1>
          <span>
            Keep your materials, annotations, practice, and review queue in
            one connected workspace.
          </span>
        </div>

        <Link className={styles.backLink} href="/">
          Back to overview
        </Link>
      </section>

      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}
