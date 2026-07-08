import styles from '../KnowledgeTrainingAnalyticsPage.module.css';

type TrainingAnalyticsTimelineBarProps = {
  heightPercent: number;
  variant: 'video' | 'quiz' | 'employee';
  title: string;
  toneClass?: string;
};

export function TrainingAnalyticsTimelineBar({
  heightPercent,
  variant,
  title,
  toneClass,
}: TrainingAnalyticsTimelineBarProps) {
  const variantClass =
    variant === 'video'
      ? styles.timelineBarVideo
      : variant === 'quiz'
        ? styles.timelineBarQuiz
        : styles.timelineBarEmployee;

  const toneStyleClass =
    variant === 'employee' && toneClass ? (styles[toneClass as keyof typeof styles] ?? '') : '';

  return (
    <div
      className={`${styles.timelineBar} ${variantClass} ${toneStyleClass}`}
      style={{ height: `${heightPercent}%` }}
      title={title}
    />
  );
}
