import profileSrc from './profile-user-square.png';

export type ProfileUserSquareIconProps = {
  size?: number;
  className?: string;
};

/** Иконка профиля — пользователь в квадратной рамке (Icons8). */
export function ProfileUserSquareIcon({ size = 18, className }: ProfileUserSquareIconProps) {
  return (
    <img
      src={typeof profileSrc === 'string' ? profileSrc : profileSrc.src}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}
