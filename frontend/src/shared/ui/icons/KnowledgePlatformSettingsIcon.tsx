import styles from './KnowledgePlatformSettingsIcon.module.css';

export const ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE = 24;

const ICON_SRC = '/icons/knowledge-platform-settings.png';

export type KnowledgePlatformSettingsIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Настройки обучающей платформы» (PNG) */
export function KnowledgePlatformSettingsIcon({
  size = ADMIN_KNOWLEDGE_PLATFORM_SETTINGS_ICON_SIZE,
  className,
}: KnowledgePlatformSettingsIconProps) {
  return (
    <img
      src={ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={[styles.icon, className].filter(Boolean).join(' ')}
      aria-hidden
    />
  );
}
