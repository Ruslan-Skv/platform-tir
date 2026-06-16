import styles from '../KnowledgeTrainingAnalyticsPage.module.css';

type TrainingAnalyticsTimelineBarProps = {
  heightPercent: number;
  variant: 'video' | 'quiz';
  title: string;
};

export function TrainingAnalyticsTimelineBar({
  heightPercent,
  variant,
  title,
}: TrainingAnalyticsTimelineBarProps) {
  return (
    <div
      className={`${styles.timelineBar} ${
        variant === 'video' ? styles.timelineBarVideo : styles.timelineBarQuiz
      }`}
      style={{ height: `${heightPercent}%` }}
      title={title}
    />
  );
}
