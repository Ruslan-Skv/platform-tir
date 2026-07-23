import bellSrc from './notification-bell.png';

export type NotificationBellIconProps = {
  size?: number;
  className?: string;
};

/** Иконка уведомлений — исходный голубой PNG колокольчика со «звонком». */
export function NotificationBellIcon({ size = 20, className }: NotificationBellIconProps) {
  return (
    <img
      src={typeof bellSrc === 'string' ? bellSrc : bellSrc.src}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}
