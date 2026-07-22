'use client';

import Link from 'next/link';

import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { PRICE_LISTS_HUB_CARDS } from './hubCards';

export function PriceListsHubPage() {
  return (
    <div className={cdBase.page}>
      <h1 className={cdWorkspace.title}>Прайсы</h1>
      <p className={cdWorkspace.subtitle}>
        Справочники цен по направлениям. Выберите направление, чтобы открыть прайс.
      </p>
      <div className={cdHub.hubGrid}>
        {PRICE_LISTS_HUB_CARDS.map((card) => (
          <Link key={card.href} className={cdHub.hubCard} href={card.href}>
            <h2 className={cdHub.hubCardTitle}>{card.title}</h2>
            <p className={cdHub.hubCardHint}>{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
