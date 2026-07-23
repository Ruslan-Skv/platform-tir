import profileMenuSrc from './profile-menu.png';

export type ProfileMenuIconProps = {
  size?: number;
  className?: string;
};

/** Иконка пункта «Профиль» в меню пользователя. */
export function ProfileMenuIcon({ size = 32, className }: ProfileMenuIconProps) {
  return (
     
    <img
      src={typeof profileMenuSrc === 'string' ? profileMenuSrc : profileMenuSrc.src}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}
