'use client';

import Link from 'next/link';

import styles from './KnowledgeBackLink.module.css';

type KnowledgeBackLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
};

/** Единый стиль ссылок «назад» на обучающей платформе. */
export function KnowledgeBackLink({ href, children, className, title }: KnowledgeBackLinkProps) {
  return (
    <Link
      href={href}
      className={className ? `${styles.link} ${className}` : styles.link}
      title={title}
    >
      {children}
    </Link>
  );
}
