import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import React from 'react';

import styles from './Modal.module.css';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: React.ReactNode;
  /** Содержимое справа от заголовка (например индикатор заполнения). */
  titleAside?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  /** Уменьшает отступы панели и заголовка на экранах ≤767px */
  compactOnMobile?: boolean;
  /** Доп. класс для панели (например компактная мобильная модалка) */
  className?: string;
  /** Доп. класс для области контента под заголовком */
  contentClassName?: string;
  /** Доп. класс для заголовка */
  titleClassName?: string;
  /** Не центрировать по вертикали — панель у верхнего края (стабильнее при смене высоты) */
  alignTop?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  titleAside,
  size = 'md',
  showCloseButton = true,
  compactOnMobile = false,
  className,
  contentClassName,
  titleClassName,
  alignTop = false,
}) => {
  const sizeClasses = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
    xl: styles.sizeXl,
  };

  return (
    <Dialog as="div" className={styles.dialog} open={isOpen} onClose={onClose}>
      <div className={styles.backdrop} />

      <div className={styles.container}>
        <div className={`${styles.center} ${alignTop ? styles.centerAlignTop : ''}`.trim()}>
          <Dialog.Panel
            className={`${styles.panel} ${sizeClasses[size]} ${compactOnMobile ? styles.panelCompactMobile : ''} ${className ?? ''}`.trim()}
          >
            {(title || showCloseButton) && (
              <div
                className={`${styles.header} ${title ? styles.headerWithTitle : styles.headerWithoutTitle} ${compactOnMobile ? styles.headerCompactMobile : ''}`.trim()}
              >
                {title && (
                  <>
                    {titleAside != null ? (
                      <div className={styles.titleRow}>
                        <Dialog.Title
                          className={`${styles.title} ${compactOnMobile ? styles.titleCompactMobile : ''} ${titleClassName ?? ''}`.trim()}
                        >
                          {title}
                        </Dialog.Title>
                        <div className={styles.titleAside}>{titleAside}</div>
                      </div>
                    ) : (
                      <Dialog.Title
                        className={`${styles.title} ${compactOnMobile ? styles.titleCompactMobile : ''} ${titleClassName ?? ''}`.trim()}
                      >
                        {title}
                      </Dialog.Title>
                    )}
                  </>
                )}

                {showCloseButton && (
                  <button
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Закрыть модальное окно"
                  >
                    <XMarkIcon className={styles.closeIcon} />
                  </button>
                )}
              </div>
            )}

            <div className={`${styles.content} ${contentClassName ?? ''}`.trim()}>{children}</div>
          </Dialog.Panel>
        </div>
      </div>
    </Dialog>
  );
};
