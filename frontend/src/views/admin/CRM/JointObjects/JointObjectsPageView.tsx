'use client';

import Link from 'next/link';

import { AdminListRefreshButton } from '@/shared/ui/admin/AdminToolbarIconButton';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';
import cdWorkspace from '@/views/admin/ContractDocuments/styles/estimates-workspace.module.css';

import { JointObjectTimeline } from './JointObjectTimeline';
import styles from './JointObjects.module.css';
import { JointObjectsRulesInfoTip } from './JointObjectsRulesInfoTip';
import type { JointObjectsPageModel } from './hooks/useJointObjectsPage';

type Props = {
  model: JointObjectsPageModel;
};

function formatDate(date: string | null | undefined) {
  if (!date) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  return match ? `${match[3]}.${match[2]}.${match[1].slice(2)}` : date.slice(0, 10);
}

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(n);
}

function searchFieldClass(base: string, active: boolean, activeClass: string): string {
  return active ? `${base} ${activeClass}` : base;
}

function directionChipClass(direction: string): string {
  const map: Record<string, string> = {
    WINDOWS: styles.chipWINDOWS,
    DOORS: styles.chipDOORS,
    CEILINGS: styles.chipCEILINGS,
    BLINDS: styles.chipBLINDS,
    REPAIR: styles.chipREPAIR,
    FURNITURE: styles.chipFURNITURE,
    DELIVERY: styles.chipDELIVERY,
  };
  return `${styles.dirChip} ${map[direction] || ''}`;
}

export function JointObjectsPageView({ model }: Props) {
  const {
    data,
    loading,
    refreshing,
    message,
    setMessage,
    search,
    setSearch,
    includeClosed,
    setIncludeClosed,
    expandedId,
    setExpandedId,
    refresh,
  } = model;

  const objects = data?.objects ?? [];
  const busy = loading || refreshing;
  const countTitle = loading
    ? 'Загрузка…'
    : `${data?.totalObjects ?? 0} объектов · ${data?.totalItems ?? 0} событий`;

  return (
    <div className={`${cdBase.page} ${cdWorkspace.pageWide} ${cdHub.contractsListPage}`}>
      <div className={cdHub.editorHeader}>
        <div className={cdHub.contractsListHeaderLeft}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={cdHub.title}>Совместные объекты</h1>
                <JointObjectsRulesInfoTip />
              </div>
              <span className={cdHub.contractsListCount} title={countTitle}>
                <span className={cdHub.contractsListCountDesktop}>{countTitle}</span>
                <span className={cdHub.contractsListCountMobile}>{data?.totalObjects ?? 0}</span>
              </span>
            </div>
            <div className={cdHub.contractsHeaderIconActionsMobile}>
              <AdminListRefreshButton
                disabled={busy}
                busy={busy}
                title="Обновить"
                aria-label="Обновить"
                onClick={() => void refresh()}
              />
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${cdHub.contractsListHeaderActions}`}>
          <div className={cdHub.contractsHeaderIconActionsDesktop}>
            <AdminListRefreshButton
              disabled={busy}
              busy={busy}
              title="Обновить"
              aria-label="Обновить"
              onClick={() => void refresh()}
            />
          </div>
        </div>
      </div>

      {message ? (
        <div className={`${styles.message} ${styles.messageerror}`}>
          <span>{message}</span>
          <button type="button" onClick={() => setMessage(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}

      <div className={cdHub.contractsListFiltersPanel}>
        <div className={cdHub.contractsListFiltersStack}>
          <div className={cdHub.contractsListFilters}>
            <input
              type="search"
              className={searchFieldClass(
                cdHub.contractsListSearchInput,
                Boolean(search.trim()),
                cdHub.contractsListFilterActive
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по адресу, заказчику, договору, направлению…"
              aria-label="Поиск по адресу, заказчику, договору, направлению"
            />
            <label className={styles.staleToggle}>
              <input
                type="checkbox"
                checked={includeClosed}
                onChange={(e) => setIncludeClosed(e.target.checked)}
              />
              Включать закрытые ремонт/мебель
            </label>
          </div>
          <p className={styles.metaLine} aria-hidden={!data?.meta}>
            {data?.meta
              ? `Монтажи: ${formatDate(data.meta.installFrom)}–${formatDate(data.meta.installTo)} · Доставки: ${formatDate(data.meta.waybillFrom)}–${formatDate(data.meta.waybillTo)}`
              : '\u00a0'}
          </p>
        </div>
      </div>

      <div className={styles.list} aria-busy={busy}>
        {!loading && objects.length === 0 ? (
          <p className={styles.emptyState}>
            Пока нет объектов, где одновременно встречаются ≥2 направления (окна, двери, потолки,
            жалюзи, ремонт, мебель). Заведите связанные договоры с общим адресом или заказчиком.
          </p>
        ) : null}
        {objects.map((object) => {
          const open = expandedId === object.id;
          return (
            <article key={object.id} className={styles.objectCard}>
              <button
                type="button"
                className={styles.objectHeader}
                aria-expanded={open}
                onClick={() => setExpandedId(open ? null : object.id)}
              >
                <span className={styles.objectExpand} aria-hidden>
                  {open ? '−' : '+'}
                </span>
                <div className={styles.objectBody}>
                  <div className={styles.objectTitleRow}>
                    <span className={styles.objectLabel}>{object.label}</span>
                    <span className={styles.objectCount}>
                      {object.itemCount} · {object.activeCount} акт.
                    </span>
                    <span className={styles.objectStats}>
                      {formatDate(object.rangeStart)} – {formatDate(object.rangeEnd)}
                    </span>
                  </div>
                  <div className={styles.subline}>
                    {[
                      object.customerNames.join(', ') || null,
                      object.addresses.filter((a) => a !== object.label).join(' · ') || null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </div>
                  <div className={styles.chips}>
                    {object.directions.map((d, idx) => (
                      <span key={d} className={directionChipClass(d)}>
                        {object.directionLabels[idx]}
                      </span>
                    ))}
                    {object.deliveryCount > 0 ? (
                      <span className={directionChipClass('DELIVERY')}>
                        Доставки · {object.deliveryCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>

              {open ? (
                <div className={styles.objectChildren}>
                  <JointObjectTimeline object={object} />

                  <div className={`${styles.directoryTable} ${styles.tableWrap}`}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Направление</th>
                          <th>Договор / событие</th>
                          <th>Статус</th>
                          <th>Срок</th>
                          <th>Исполнитель</th>
                          <th>Сумма</th>
                          <th>Детали</th>
                        </tr>
                      </thead>
                      <tbody>
                        {object.items.map((item) => (
                          <tr key={`${item.kind}-${item.id}`}>
                            <td>
                              <span className={directionChipClass(item.direction)}>
                                {item.directionLabel}
                              </span>
                            </td>
                            <td>
                              <Link href={item.href} className={styles.itemLink}>
                                {item.title}
                              </Link>
                              {item.contractNumber && item.contractNumber !== item.title ? (
                                <span className={styles.subline}>{item.contractNumber}</span>
                              ) : null}
                            </td>
                            <td>
                              <span className={styles.badge}>{item.statusLabel}</span>
                            </td>
                            <td className={styles.cellMain}>
                              {item.isPoint
                                ? formatDate(item.startDate)
                                : `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`}
                              {item.deadlineWarning === 'OVERDUE' ||
                              item.deadlineWarning === 'D3' ? (
                                <span
                                  className={`${styles.deadlineWarn} ${styles.deadlineWarnUrgent}`}
                                >
                                  Срок!
                                </span>
                              ) : item.deadlineWarning ? (
                                <span
                                  className={`${styles.deadlineWarn} ${styles.deadlineWarnSoft}`}
                                >
                                  Близко к сроку
                                </span>
                              ) : null}
                            </td>
                            <td>{item.assigneeName || '—'}</td>
                            <td>{formatMoney(item.contractSum)}</td>
                            <td className={styles.cellMain}>{item.note || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
