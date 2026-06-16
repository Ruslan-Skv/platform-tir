import styles from '../KnowledgeTrainingAnalyticsPage.module.css';

type TrainingAnalyticsBarFillProps = {
  percent: number;
  toneClass: string;
};

export function TrainingAnalyticsBarFill({ percent, toneClass }: TrainingAnalyticsBarFillProps) {
  return (
    <div
      className={`${styles.barFill} ${styles[toneClass as keyof typeof styles] ?? ''}`}
      style={{ width: `${percent}%` }}
    />
  );
}
