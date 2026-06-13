type VideoProgressFillProps = {
  percent: number;
  className?: string;
};

/** Заполнение progress-bar с runtime-шириной. */
export function VideoProgressFill({ percent, className }: VideoProgressFillProps) {
  return <div className={className} style={{ width: `${percent}%` }} />;
}
