import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowRightIcon, ShieldCheckIcon } from "@/components/ui/icons";

import styles from "./auth.module.css";

type AuthLayoutProps = Readonly<{ children: ReactNode }>;

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className={styles.page}>
      <section className={styles.context}>
        <Link className={styles.brand} href="/" aria-label="Coilora home">
          <span className={styles.brandMark}>
            <Image src="/brand/coilora-mark.png" width={112} height={112} priority alt="" />
          </span>
          <span>Coilora</span>
        </Link>

        <div className={styles.contextContent}>
          <div className={styles.contextCopy}>
            <p>One connected study space</p>
            <h1>Less switching. More learning.</h1>
            <span>Keep the source, your thinking, and your next review together.</span>
          </div>

          <div className={styles.paperScene} aria-hidden="true">
            <div className={styles.paperBack} />
            <div className={styles.paperFront}>
              <div className={styles.paperHeader}><span>Cardiac physiology</span><small>Page 12</small></div>
              <strong>Conduction pathway</strong>
              <i /><i /><i />
              <mark><i /><i /></mark>
              <div className={styles.paperNote}>Review the AV node delay</div>
            </div>
            <div className={styles.sourceChip}><ShieldCheckIcon /><span>Source connected</span></div>
          </div>
        </div>

        <Link className={styles.backLink} href="/">
          Back to overview <ArrowRightIcon />
        </Link>
      </section>

      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}
