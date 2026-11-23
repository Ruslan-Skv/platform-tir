'use client';

import { useFormContext } from '@/features/forms/context/FormContext';
import type { BlindsPageSettings } from '@/shared/api/blinds';
import { Button } from '@/shared/ui/Button/Button';

import styles from './BlindsPage.module.css';

/**
 * CTA-блок «Поможем выбрать жалюзи».
 * Фон настраивается из админки: цвет и/или картинка с процентом прозрачности.
 */
export function BlindsCtaBlock({
  settings,
  getImageUrl,
}: {
  settings: BlindsPageSettings;
  getImageUrl: (url: string | null | undefined) => string;
}) {
  const { measurementModal, quoteModal } = useFormContext();

  const ctaImage = getImageUrl(settings.ctaBackgroundImage);
  const ctaImageOpacity = Math.max(0, Math.min(100, settings.ctaBackgroundImageOpacity ?? 30));

  // Вариант размещения картинки из админки (по умолчанию — вписать целиком)
  const fit =
    settings.ctaBackgroundFit === 'cover' || settings.ctaBackgroundFit === 'tile'
      ? settings.ctaBackgroundFit
      : 'contain';
  const fitStyles =
    fit === 'tile'
      ? { backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: 'left top' }
      : { backgroundSize: fit, backgroundRepeat: 'no-repeat', backgroundPosition: 'center' };

  return (
    <section
      className={styles.ctaSection}
      style={{
        ...(settings.ctaBackgroundColor ? { backgroundColor: settings.ctaBackgroundColor } : {}),
        ...(settings.ctaTextColor ? { color: settings.ctaTextColor } : {}),
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
        <h2 className={styles.ctaTitle}>Поможем выбрать жалюзи</h2>
        <p className={styles.ctaText}>
          Расскажите про окна и бюджет — предложим систему и ткань, рассчитаем стоимость с
          изготовлением и монтажом, ответим на вопросы. Замер с каталогами тканей — бесплатный,
          монтаж — за один визит.
        </p>
        {settings.ctaShowButtons !== false && (
          <div className={styles.ctaActions}>
            <Button
              variant="primary"
              onClick={measurementModal.open}
              data-action-button="measurement"
            >
              Вызвать замерщика
            </Button>
            <Button variant="outline" onClick={quoteModal.open}>
              Получить расчёт
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
