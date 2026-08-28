import Image from "next/image";

import styles from "./brand-intro.module.css";

export function BrandIntro() {
  return (
    <div className={styles.intro} aria-hidden="true">
      <div className={styles.markWrap}>
        <span className={styles.orbit} />
        <Image src="/brand/coilora-mark.png" width={160} height={160} alt="" priority />
      </div>
      <span className={styles.wordmark}>Coilora</span>
    </div>
  );
}
