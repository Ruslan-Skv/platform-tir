'use client';

import { useFormContext } from '@/features/forms/context/FormContext';
import type { ServiceCatalogBlockContent } from '@/shared/api/service-catalog';
import { Button } from '@/shared/ui/Button/Button';

import styles from './ServiceCatalogPage.module.css';

const DEFAULT_CTA_TITLE = 'Поможем подобрать услугу';
const DEFAULT_CTA_TEXT =
  'Расскажите про помещение и задачу — подскажем состав работ, рассчитаем стоимость по каталогу и ответим на вопросы.';

/**
 * CTA-блок «Поможем подобрать услугу».
 * Фон настраивается из админки: цвет и/или картинка с процентом прозрачности.
 */
export function ServiceCatalogCtaBlock({ block }: { block: ServiceCatalogBlockContent }) {
  const { callbackModal, quoteModal } = useFormContext();

  const ctaImage = block.ctaBackgroundImage?.trim() || null;
  const ctaImageOpacity = Math.max(0, Math.min(100, block.ctaBackgroundImageOpacity ?? 30));

  // Вариант размещения картинки из админки (по умолчанию — вписать целиком)
  const fit =
    block.ctaBackgroundFit === 'cover' || block.ctaBackgroundFit === 'tile'
      ? block.ctaBackgroundFit
      : 'contain';
  const fitStyles =
    fit === 'tile'
      ? { backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'left top' }
      : { backgroundSize: fit, backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };

  return (
    <section
      className={styles.ctaSection}
      style={{
        ...(block.ctaBackgroundColor ? { backgroundColor: block.ctaBackgroundColor } : {}),
        ...(block.ctaTextColor ? { color: block.ctaTextColor } : {}),
      }}
    >
      {ctaImage && (
        <div
          className={styles.ctaBgImage}
          style={{
            backgroundImage: `url("${ctaImage}")`,
            opacity: ctaImageOpacity / 100,
            ...fitStyles,
          }}
          aria-hidden="true"
        />
      )}
      <div className={styles.ctaContent}>
        <h2 className={styles.ctaTitle}>{block.ctaTitle?.trim() || DEFAULT_CTA_TITLE}</h2>
        <p className={styles.ctaText}>{block.ctaText?.trim() || DEFAULT_CTA_TEXT}</p>
        {block.ctaShowButtons !== false && (
          <div className={styles.ctaActions}>
            <Button variant="primary" onClick={callbackModal.open} data-action-button="callback">
              Заказать звонок
            </Button>
            <Button variant="outline" onClick={quoteModal.open}>
              Рассчитать стоимость
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
