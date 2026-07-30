import styles from './CallCustomerIcon.module.css';
import callCustomerDarkSrc from './call-customer-dark.png';
import callCustomerSrc from './call-customer.png';

export type CallCustomerIconProps = {
  size?: number;
  className?: string;
};

/** Иконка «Позвонить заказчику» (аватар + трубка); светлая/тёмная тема. */
export function CallCustomerIcon({ size = 28, className }: CallCustomerIconProps) {
  const lightSrc = typeof callCustomerSrc === 'string' ? callCustomerSrc : callCustomerSrc.src;
  const darkSrc =
    typeof callCustomerDarkSrc === 'string' ? callCustomerDarkSrc : callCustomerDarkSrc.src;
  const wrapClass = [styles.wrap, className].filter(Boolean).join(' ');

  return (
    <span className={wrapClass} style={{ width: size, height: size }}>
      <img
        src={lightSrc}
        alt=""
        width={size}
        height={size}
        className={styles.light}
        aria-hidden
        draggable={false}
      />
      <img
        src={darkSrc}
        alt=""
        width={size}
        height={size}
        className={styles.dark}
        aria-hidden
        draggable={false}
      />
    </span>
  );
}
