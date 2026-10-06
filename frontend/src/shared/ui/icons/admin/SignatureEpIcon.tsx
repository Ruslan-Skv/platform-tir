import signatureEpSrc from './signature-ep.png';

export const ADMIN_SIGNATURE_EP_ICON_SIZE = 18;

export type SignatureEpIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Подпись ЭП» (перо с подписью); цвет задаётся фоном кнопки-обёртки. */
export function SignatureEpIcon({
  size = ADMIN_SIGNATURE_EP_ICON_SIZE,
  className,
}: SignatureEpIconProps) {
  const src = typeof signatureEpSrc === 'string' ? signatureEpSrc : signatureEpSrc.src;
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
