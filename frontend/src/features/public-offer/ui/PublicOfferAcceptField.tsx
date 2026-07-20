'use client';

import type { MouseEvent, ReactNode } from 'react';

import Link from 'next/link';

import {
  type PublicOfferInfo,
  areAllOffersAccepted,
  isPublicOfferActive,
  publicOfferPath,
} from '@/shared/lib/legal/public-offer';

import styles from './PublicOfferAcceptField.module.css';

type PublicOfferAcceptFieldProps = {
  offer: PublicOfferInfo;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
};

function OfferDocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={styles.link}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
      }}
    >
      {children}
    </Link>
  );
}

function renderAcceptText(offer: PublicOfferInfo) {
  const acceptText = offer.acceptText || 'Я принимаю условия публичной оферты';
  const linkPhrase = offer.name || 'публичной оферты';
  const linkIndex = acceptText.toLowerCase().indexOf(linkPhrase.toLowerCase());
  const href = publicOfferPath(offer.slug);

  if (linkIndex >= 0) {
    return (
      <>
        {acceptText.slice(0, linkIndex)}
        <OfferDocLink href={href}>
          {acceptText.slice(linkIndex, linkIndex + linkPhrase.length)}
        </OfferDocLink>
        {acceptText.slice(linkIndex + linkPhrase.length)}
      </>
    );
  }

  return (
    <>
      {acceptText} <OfferDocLink href={href}>(читать)</OfferDocLink>
    </>
  );
}

export function PublicOfferAcceptField({
  offer,
  checked,
  onChange,
  className,
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
          if ((e.target as HTMLElement).closest('a')) return;
          onChange(!checked);
        }}
      >
        {renderAcceptText(offer)}
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

export function PublicOfferAcceptFields({
  offers,
  acceptedIds,
  onToggle,
  className,
}: PublicOfferAcceptFieldsProps) {
  const activeOffers = offers.filter(isPublicOfferActive);
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
          className={styles.multiField}
        />
      ))}
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
