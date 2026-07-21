'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  type PublicOfferInfo,
  areAllOffersAccepted,
  isPublicOfferActive,
  isPublicOfferPdfUrl,
  renderPublicOfferHtml,
  resolvePublicOfferEmbedUrl,
} from '@/shared/lib/legal/public-offer';
import { Modal } from '@/shared/ui/Modal';

import styles from './PublicOfferAcceptField.module.css';

type PublicOfferAcceptFieldProps = {
  offer: PublicOfferInfo;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  onOpenOffer: (offer: PublicOfferInfo) => void;
};

function OfferDocButton({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={styles.link}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
    >
      {children}
    </button>
  );
}

function renderAcceptText(offer: PublicOfferInfo, onOpen: () => void) {
  const acceptText = offer.acceptText || 'Я принимаю условия публичной оферты';
  const linkPhrase = offer.name || 'публичной оферты';
  const linkIndex = acceptText.toLowerCase().indexOf(linkPhrase.toLowerCase());

  if (linkIndex >= 0) {
    return (
      <>
        {acceptText.slice(0, linkIndex)}
        <OfferDocButton onOpen={onOpen}>
          {acceptText.slice(linkIndex, linkIndex + linkPhrase.length)}
        </OfferDocButton>
        {acceptText.slice(linkIndex + linkPhrase.length)}
      </>
    );
  }

  return (
    <>
      {acceptText} <OfferDocButton onOpen={onOpen}>(читать)</OfferDocButton>
    </>
  );
}

export function PublicOfferAcceptField({
  offer,
  checked,
  onChange,
  className,
  onOpenOffer,
}: PublicOfferAcceptFieldProps) {
  if (!isPublicOfferActive(offer)) {
    return null;
  }

  return (
    <div className={`${styles.label}${className ? ` ${className}` : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.checkbox}
        required
        aria-label={offer.acceptText || 'Я принимаю условия публичной оферты'}
      />
      <span
        className={styles.text}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          onChange(!checked);
        }}
      >
        {renderAcceptText(offer, () => onOpenOffer(offer))}
      </span>
    </div>
  );
}

type PublicOfferAcceptFieldsProps = {
  offers: PublicOfferInfo[];
  acceptedIds: Set<string>;
  onToggle: (offerId: string, accepted: boolean) => void;
  className?: string;
};

function PublicOfferPreviewBody({ offer }: { offer: PublicOfferInfo }) {
  const pdfUrl = isPublicOfferPdfUrl(offer.offerUrl)
    ? resolvePublicOfferEmbedUrl(offer.offerUrl)
    : null;
  const html = offer.offerContent ? renderPublicOfferHtml(offer.offerContent) : null;

  if (html) {
    return <div className={styles.previewText} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (pdfUrl) {
    return (
      <div className={styles.previewPdf}>
        <p className={styles.previewPdfHint}>
          Документ в формате PDF. Если предпросмотр не отображается, откройте файл отдельно.
        </p>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" data-modal-btn="primary">
          Открыть PDF
        </a>
        <iframe className={styles.previewPdfFrame} src={pdfUrl} title={offer.pageTitle} />
      </div>
    );
  }

  return <p className={styles.previewEmpty}>Текст оферты ещё не загружен.</p>;
}

export function PublicOfferAcceptFields({
  offers,
  acceptedIds,
  onToggle,
  className,
}: PublicOfferAcceptFieldsProps) {
  const activeOffers = offers.filter(isPublicOfferActive);
  const [previewOffer, setPreviewOffer] = useState<PublicOfferInfo | null>(null);

  if (activeOffers.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {activeOffers.map((offer) => (
        <PublicOfferAcceptField
          key={offer.id}
          offer={offer}
          checked={acceptedIds.has(offer.id)}
          onChange={(checked) => onToggle(offer.id, checked)}
          onOpenOffer={setPreviewOffer}
          className={styles.multiField}
        />
      ))}

      <Modal
        isOpen={previewOffer != null}
        onClose={() => setPreviewOffer(null)}
        title={previewOffer?.pageTitle || 'Публичная оферта'}
        size="lg"
        showCloseButton
        className={styles.modalPanel}
        contentClassName={styles.modalContent}
      >
        <div className={styles.formShell} data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Договор оферты. Ознакомьтесь с текстом перед подтверждением согласия в корзине.
          </p>

          <div className={styles.previewCard}>
            {previewOffer ? <PublicOfferPreviewBody offer={previewOffer} /> : null}
          </div>

          <div data-modal-form-actions>
            <button type="button" data-modal-btn="secondary" onClick={() => setPreviewOffer(null)}>
              Закрыть
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function isOffersAcceptanceComplete(
  offers: PublicOfferInfo[],
  acceptedIds: Set<string>
): boolean {
  const activeOffers = offers.filter(isPublicOfferActive);
  if (activeOffers.length === 0) {
    return true;
  }
  return areAllOffersAccepted(activeOffers, acceptedIds);
}
