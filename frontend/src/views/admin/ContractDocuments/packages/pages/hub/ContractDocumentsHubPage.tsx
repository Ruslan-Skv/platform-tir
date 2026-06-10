'use client';

import Link from 'next/link';

import cdBase from '../../../styles/base.module.css';
import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';

export function ContractDocumentsHubPage() {
  return (
    <div className={cdBase.page}>
      <h1 className={cdWorkspace.title}>Оформление договоров</h1>
      <p className={cdWorkspace.subtitle}>
        Выберите направление. Для каждого направления — свой набор вкладок и шаблонов, как в
        Excel-книге.
      </p>
      <div className={cdHub.hubGrid}>
        <Link className={cdHub.hubCard} href="/admin/contract-documents/instruction">
          <h2 className={cdHub.hubCardTitle}>Инструкция по работе с разделом</h2>
          <p className={cdHub.hubCardHint}>
            Плейсхолдеры, Excel, CRM, печать и хранение шаблонов — всё в одном месте.
          </p>
        </Link>
        <Link className={cdHub.hubCard} href="/admin/contract-documents/requisites">
          <h2 className={cdHub.hubCardTitle}>Исполнители</h2>
          <p className={cdHub.hubCardHint}>
            Наборы реквизитов Исполнителя для быстрого выбора в договоре.
          </p>
        </Link>
        <Link className={cdHub.hubCard} href="/admin/contract-documents/signatories">
          <h2 className={cdHub.hubCardTitle}>Менеджеры</h2>
          <p className={cdHub.hubCardHint}>
            Карточки менеджера для договоров: ФИО, основание полномочий, офис продаж и связь с CRM.
          </p>
        </Link>
        <Link className={cdHub.hubCard} href="/admin/contract-documents/templates">
          <h2 className={cdHub.hubCardTitle}>Библиотека шаблонов</h2>
          <p className={cdHub.hubCardHint}>
            Договор, акты, ПКО и производственный журнал для направления «Ремонт».
          </p>
        </Link>
        <Link className={cdHub.hubCard} href="/admin/contract-documents/settings">
          <h2 className={cdHub.hubCardTitle}>Сроки договоров</h2>
          <p className={cdHub.hubCardHint}>
            Срок по умолчанию для «Ремонт» и «Окна» (рабочие дни); меняет только суперадмин.
          </p>
        </Link>
        <Link className={cdHub.hubCard} href="/admin/contract-documents/settings/markups">
          <h2 className={cdHub.hubCardTitle}>Наценки договоров</h2>
          <p className={cdHub.hubCardHint}>
            Наценка при расчёте заказ-наряда по «Окна» (цена счёт-заказа минус %); меняет
            суперадмин.
          </p>
        </Link>
      </div>
    </div>
  );
}
