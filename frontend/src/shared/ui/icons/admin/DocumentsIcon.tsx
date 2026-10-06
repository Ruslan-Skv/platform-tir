import documentsSrc from './documents.png';

export const ADMIN_DOCUMENTS_ICON_SIZE = 15;

export type DocumentsIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Документы» (стопка листов) — напр., «Счета договора». */
export function DocumentsIcon({ size = ADMIN_DOCUMENTS_ICON_SIZE, className }: DocumentsIconProps) {
  const src = typeof documentsSrc === 'string' ? documentsSrc : documentsSrc.src;
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={className}
      aria-hidden
      draggable={false}
    />
  );
}
