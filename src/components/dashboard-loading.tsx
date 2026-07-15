import styles from "./dashboard-loading.module.css";

export function DashboardLoading() {
  return (
    <div className={styles.wrap} aria-label="Carregando visão geral" aria-busy="true">
      <div className={styles.header}>
        <span className={`${styles.line} ${styles.eyebrow}`} />
        <span className={`${styles.line} ${styles.title}`} />
        <span className={`${styles.line} ${styles.description}`} />
      </div>

      <div className={styles.metrics}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className={styles.card} key={`metric-${index}`}>
            <span className={`${styles.line} ${styles.label}`} />
            <span className={`${styles.line} ${styles.value}`} />
            <span className={`${styles.line} ${styles.small}`} />
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className={styles.actionCard} key={`action-${index}`}>
            <span className={styles.icon} />
            <div className={styles.actionCopy}>
              <span className={`${styles.line} ${styles.label}`} />
              <span className={`${styles.line} ${styles.valueSmall}`} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.panel}>
          <span className={`${styles.line} ${styles.panelTitle}`} />
          {Array.from({ length: 4 }).map((_, index) => (
            <span className={styles.row} key={`row-${index}`} />
          ))}
        </div>
        <div className={styles.panel}>
          <span className={`${styles.line} ${styles.panelTitle}`} />
          {Array.from({ length: 3 }).map((_, index) => (
            <span className={styles.row} key={`side-${index}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
