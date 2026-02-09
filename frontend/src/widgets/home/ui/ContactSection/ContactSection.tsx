'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { ActionButton, useFormContext } from '@/features/forms';
import type { ContactFormBlock } from '@/shared/api/contact-form';
import { getContactFormBlock } from '@/shared/api/contact-form';

import styles from './ContactSection.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const UPLOADS_BASE = API_URL.replace(/\/api\/v1\/?$/, '');

const DEFAULT_BLOCK: ContactFormBlock = {
  title: 'Готовы начать проект?',
  subtitle: 'Оставьте заявку и получите бесплатную консультацию специалиста',
};

function resolveBackgroundImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  if (url.startsWith('http')) return url;
  return `${UPLOADS_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const ContactSection: React.FC = () => {
  const { measurementModal, callbackModal } = useFormContext();
  const [block, setBlock] = useState<ContactFormBlock>(DEFAULT_BLOCK);

  useEffect(() => {
    getContactFormBlock()
      .then(setBlock)
      .catch(() => {});
  }, []);

  const backgroundImageUrl = useMemo(
    () => resolveBackgroundImageUrl(block.backgroundImage ?? null),
    [block.backgroundImage]
  );
  const backgroundOpacity = block.backgroundOpacity != null ? block.backgroundOpacity : 0.5;

  const sectionStyle = useMemo(() => {
    if (!backgroundImageUrl) return undefined;
    const safeUrl = backgroundImageUrl.replace(/'/g, "\\'");
    return {
      '--contact-bg-image': `url('${safeUrl}')`,
      '--contact-bg-opacity': String(backgroundOpacity),
    } as React.CSSProperties;
  }, [backgroundImageUrl, backgroundOpacity]);

  return (
    <section
      className={styles.contact}
      style={sectionStyle}
      data-has-bg={!!backgroundImageUrl || undefined}
    >
      {backgroundImageUrl ? <div className={styles.background} aria-hidden /> : null}
      <div className={styles.container}>
        <div className={styles.content}>
          <h2 className={styles.title}>
            {(() => {
              const spaceIndex = block.title.indexOf(' ');
              if (spaceIndex === -1) {
                return <span className={styles.titleFirst}>{block.title}</span>;
              }
              return (
                <>
                  <span className={styles.titleFirst}>{block.title.slice(0, spaceIndex)} </span>
                  <span className={styles.titleSecond}>{block.title.slice(spaceIndex + 1)}</span>
                </>
              );
            })()}
          </h2>
          <p className={styles.subtitle}>{block.subtitle}</p>

          <div className={styles.actions}>
            <span className={styles.measurementButtonWrap}>
              <ActionButton variant="measurement" onClick={measurementModal.open} />
            </span>
            <button type="button" className={styles.callbackLink} onClick={callbackModal.open}>
              Заказать обратный звонок
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
