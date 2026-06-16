import styles from './PinIcon.module.css';

export const ADMIN_ACTION_ICON_PIN_CLASS = 'admin-action-icon-pin';

export const ADMIN_PIN_ICON_SIZE = 14;

export type PinIconProps = {
  size?: number;
  className?: string;
  /** Закреплён — яркая красная булавка; незакреплён — серая */
  pinned?: boolean;
};

/** Иконка «Закрепить» (булавка), единый вид по проекту */
export function PinIcon({ size = ADMIN_PIN_ICON_SIZE, className, pinned = false }: PinIconProps) {
  return (
    <span
      aria-hidden
      className={[styles.icon, pinned ? styles.iconPinned : styles.iconUnpinned, className]
        .filter(Boolean)
        .join(' ')}
      style={{ width: size, height: size }}
    />
  );
}
