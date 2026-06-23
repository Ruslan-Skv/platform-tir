const ICON_SRC = '/icons/admin-access-icon.png';

export type AdminAccessIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Доступ / права» для админки (щит). */
export function AdminAccessIcon({ size = 16, className }: AdminAccessIconProps) {
  return (
    <img
      src={ICON_SRC}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}
