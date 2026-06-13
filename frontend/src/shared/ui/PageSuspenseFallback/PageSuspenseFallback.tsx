import styles from './PageSuspenseFallback.module.css';

type PageSuspenseFallbackProps = {
  message?: string;
  compact?: boolean;
};

export function PageSuspenseFallback({
  message = 'Загрузка…',
  compact = false,
}: PageSuspenseFallbackProps) {
  return <div className={compact ? styles.rootCompact : styles.root}>{message}</div>;
}
