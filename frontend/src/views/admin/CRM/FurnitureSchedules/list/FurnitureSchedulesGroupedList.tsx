'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

import type { FurnitureScheduleProject } from '@/shared/api/crm/admin-furniture-schedules';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { DeleteIcon, EditIcon, PublishIcon } from '@/shared/ui/icons';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { FurnitureDeadlineWarningBadge } from '../shared/FurnitureDeadlineWarningBadge';
import styles from '../shared/FurnitureSchedules.module.css';
import { FURNITURE_STATUS_LABELS, formatDate, formatMoney } from '../shared/furniture-schedules';
import {
  buildRepairObjectGroups,
  furnitureObjectGroupSumLabel,
} from '../shared/furnitureObjectGroups';

type Props = {
  items: FurnitureScheduleProject[];
  loading: boolean;
  submitting: boolean;
  openProject: (id: string) => void;
  moveStatus: (
    item: FurnitureScheduleProject,
    status: 'NEW' | 'IN_PROGRESS' | 'CLAIMS' | 'CLOSED'
  ) => Promise<boolean>;
  onDelete: (item: FurnitureScheduleProject) => void;
  flashSuccess: (text: string) => void;
};

const COL_SPAN = 8;

export function FurnitureSchedulesGroupedList({
  items,
  loading,
  submitting,
  openProject,
  moveStatus,
  onDelete,
  flashSuccess,
}: Props) {
  const groups = useMemo(() => buildRepairObjectGroups(items), [items]);
  const clusterKey = useMemo(
    () =>
      groups
        .filter((g) => g.isCluster)
        .map((g) => g.id)
        .join('\n'),
    [groups]
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setExpandedIds(
      new Set(
        clusterKey
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    );
  }, [clusterKey]);

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderActions = (item: FurnitureScheduleProject) => (
    <div className={styles.actions}>
      <AdminTableIconButton
        aria-label="Открыть"
        title="Открыть карточку"
        onClick={() => openProject(item.id)}
      >
        <EditIcon />
      </AdminTableIconButton>
      {item.status === 'NEW' ? (
        <AdminTableIconButton
          data-admin-mutation
          aria-label="В работу"
          title="Перевести в работу"
          onClick={() => {
            void moveStatus(item, 'IN_PROGRESS').then((ok) => {
              if (ok) flashSuccess('Проект в работе');
            });
          }}
        >
          <PublishIcon />
        </AdminTableIconButton>
      ) : null}
      {item.status === 'IN_PROGRESS' || item.status === 'CLAIMS' ? (
        <AdminTableIconButton
          data-admin-mutation
          aria-label="Закрыть"
          title="Закрыть договор"
          onClick={() => {
            void moveStatus(item, 'CLOSED').then((ok) => {
              if (ok) flashSuccess('Договор закрыт');
            });
          }}
        >
          <PublishIcon />
        </AdminTableIconButton>
      ) : null}
      <AdminTableIconButton
        data-admin-mutation
        aria-label="Удалить"
        title="Удалить"
        onClick={() => onDelete(item)}
      >
        <DeleteIcon />
      </AdminTableIconButton>
    </div>
  );

  const renderProjectCells = (item: FurnitureScheduleProject, hideCustomer: boolean) => (
    <>
      <td>
        <button type="button" className={styles.contractCell} onClick={() => openProject(item.id)}>
          <strong>{item.contractNumber || 'Без номера'}</strong>
          {item.workScope ? <span className={styles.subline}>{item.workScope}</span> : null}
        </button>
      </td>
      <td>{item.installerName || '—'}</td>
      <td>
        {hideCustomer ? (
          <span className={styles.subline}>—</span>
        ) : (
          <div className={styles.customerCell}>
            <div>{item.customerName || '—'}</div>
            {item.customerAddress ? (
              <span className={styles.subline}>{item.customerAddress}</span>
            ) : null}
          </div>
        )}
      </td>
      <td>{formatMoney(item.contractSum)}</td>
      <td>
        <div className={styles.cellMain}>
          <div>{formatDate(item.calculatedEndDate)}</div>
          <FurnitureDeadlineWarningBadge
            level={item.deadlineWarning}
            daysLeft={item.deadlineDaysLeft}
          />
        </div>
      </td>
      <td>
        <div className={styles.cellMain}>
          {item.latestEntry ? (
            <>
              <div>{formatDate(item.latestEntry.date)}</div>
              <span className={styles.subline}>{item.latestEntry.text.slice(0, 80)}</span>
            </>
          ) : (
            '—'
          )}
          {item.stale ? (
            <div className={styles.stale}>Нет записи &gt; {item.staleDays} дн.</div>
          ) : null}
        </div>
      </td>
      <td>
        <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
          {FURNITURE_STATUS_LABELS[item.status]}
        </span>
      </td>
      <td>{renderActions(item)}</td>
    </>
  );

  const renderMobileCard = (item: FurnitureScheduleProject) => (
    <article key={item.id} className={styles.mobileCard}>
      <div className={styles.mobileCardTop}>
        <div>
          <div className={styles.mobileCardName}>{item.contractNumber || 'Без номера'}</div>
          <div className={styles.mobileCardMeta}>
            {item.installerName || 'Без мастера'}
            {item.workScope ? ` · ${item.workScope}` : ''}
          </div>
        </div>
        <span className={`${styles.badge} ${styles[`badge${item.status}`]}`}>
          {FURNITURE_STATUS_LABELS[item.status]}
        </span>
      </div>
      {item.customerName || item.customerAddress ? (
        <div className={styles.mobileCardMeta}>
          {[item.customerName, item.customerAddress].filter(Boolean).join(' · ')}
        </div>
      ) : null}
      {item.latestEntry ? (
        <div className={styles.mobileCardMeta}>
          {formatDate(item.latestEntry.date)}: {item.latestEntry.text.slice(0, 100)}
        </div>
      ) : null}
      {item.calculatedEndDate ? (
        <div className={styles.mobileCardMeta}>Срок: {formatDate(item.calculatedEndDate)}</div>
      ) : null}
      <FurnitureDeadlineWarningBadge
        level={item.deadlineWarning}
        daysLeft={item.deadlineDaysLeft}
      />
      {item.stale ? <div className={styles.stale}>Нет записи &gt; {item.staleDays} дн.</div> : null}
      <div className={styles.mobileCardActions}>
        <div className={styles.actions}>
          <AdminTableIconButton
            aria-label="Открыть"
            title="Открыть"
            onClick={() => openProject(item.id)}
          >
            <EditIcon />
          </AdminTableIconButton>
        </div>
      </div>
    </article>
  );

  if (loading && items.length === 0) {
    return (
      <>
        <div className={styles.mobileCards} aria-label="Проекты мебели">
          <p className={styles.mobileLoading}>Загрузка…</p>
        </div>
        <div className={`${dataTableStyles.tableContainer} ${styles.directoryTable}`}>
          <p className={styles.emptyState}>Загрузка…</p>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <div className={styles.mobileCards} aria-label="Проекты мебели">
          <p className={styles.mobileEmpty}>Проектов нет</p>
        </div>
        <div className={`${dataTableStyles.tableContainer} ${styles.directoryTable}`}>
          <p className={styles.emptyState}>Проектов нет</p>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.mobileCards} aria-label="Проекты мебели">
        {groups.map((group) => {
          if (!group.isCluster) {
            return renderMobileCard(group.projects[0]);
          }
          const expanded = expandedIds.has(group.id);
          return (
            <div key={group.id} className={styles.mobileObjectGroup}>
              <button
                type="button"
                className={styles.mobileObjectHeader}
                aria-expanded={expanded}
                onClick={() => toggle(group.id)}
              >
                <span className={styles.mobileObjectExpand}>{expanded ? '−' : '+'}</span>
                <span className={styles.mobileObjectBody}>
                  <span className={styles.mobileObjectTitleRow}>
                    <span className={cdBase.contractsListObjectKindChip}>Объект</span>
                    <strong className={styles.mobileObjectLabel}>{group.label}</strong>
                    <span className={styles.mobileObjectCount}>({group.projects.length})</span>
                  </span>
                  <span className={styles.mobileCardMeta}>
                    {[...group.customerNames, ...group.addresses.filter((a) => a !== group.label)]
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(' · ')}
                  </span>
                </span>
              </button>
              {expanded ? (
                <div className={styles.mobileObjectChildren}>
                  {group.projects.map((item) => renderMobileCard(item))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        className={`${dataTableStyles.tableContainer} ${styles.directoryTable} ${styles.groupedTable}`}
      >
        <div className={dataTableStyles.tableWrapper}>
          <div className={dataTableStyles.scrollContainer}>
            <table className={dataTableStyles.table}>
              <thead>
                <tr>
                  <th>Договор</th>
                  <th>Мастер</th>
                  <th>Заказчик / адрес</th>
                  <th>Стоимость</th>
                  <th>Срок окончания</th>
                  <th>Последняя запись</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  if (!group.isCluster) {
                    const item = group.projects[0];
                    return (
                      <tr key={item.id} className={dataTableStyles.row}>
                        {renderProjectCells(item, false)}
                      </tr>
                    );
                  }

                  const expanded = expandedIds.has(group.id);
                  const metaCustomers = group.customerNames.filter((n) => n !== group.label);
                  const metaAddresses = group.addresses.filter((a) => a !== group.label);

                  return (
                    <Fragment key={group.id}>
                      <tr
                        className={`${dataTableStyles.row} ${cdHub.contractsListObjectGroupRow} ${
                          expanded
                            ? cdHub.contractsListObjectGroupRowExpanded
                            : cdHub.contractsListObjectGroupRowCollapsed
                        } ${styles.objectGroupRow}`}
                      >
                        <td colSpan={COL_SPAN} className={styles.objectGroupCell}>
                          <div className={cdHub.contractsListObjectHeader}>
                            <div className={cdHub.contractsListObjectHeaderControls}>
                              <button
                                type="button"
                                className={cdBase.contractsListExpandBtn}
                                aria-expanded={expanded}
                                aria-label={
                                  expanded
                                    ? 'Свернуть договоры объекта'
                                    : 'Развернуть договоры объекта'
                                }
                                title={expanded ? 'Свернуть' : 'Развернуть'}
                                onClick={() => toggle(group.id)}
                              >
                                {expanded ? '−' : '+'}
                              </button>
                            </div>
                            <div className={cdHub.contractsListObjectHeaderMain}>
                              <div className={cdHub.contractsListObjectHeaderTitleBlock}>
                                <div className={cdBase.contractsListObjectTitleRow}>
                                  <span className={cdBase.contractsListObjectKindChip}>Объект</span>
                                  <span
                                    className={cdBase.contractsListObjectAddressLabel}
                                    title={group.label}
                                  >
                                    {group.label}
                                  </span>
                                  <span className={cdBase.contractsListObjectBadge}>
                                    ({group.projects.length})
                                  </span>
                                </div>
                                {metaCustomers.length > 0 || metaAddresses.length > 0 ? (
                                  <div className={cdHub.contractsListObjectHeaderMeta}>
                                    {metaCustomers.map((name) => (
                                      <span
                                        key={`c-${name}`}
                                        className={cdHub.contractsListObjectMetaChip}
                                        title={name}
                                      >
                                        {name}
                                      </span>
                                    ))}
                                    {metaAddresses.map((addr) => (
                                      <span
                                        key={`a-${addr}`}
                                        className={cdHub.contractsListObjectMetaChip}
                                        title={addr}
                                      >
                                        {addr}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                              <div className={styles.objectGroupStats}>
                                <span title="Сумма договоров объекта">
                                  {furnitureObjectGroupSumLabel(group.projects)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expanded
                        ? group.projects.map((item) => (
                            <tr
                              key={item.id}
                              className={`${dataTableStyles.row} ${styles.objectChildRow}`}
                            >
                              {renderProjectCells(item, true)}
                            </tr>
                          ))
                        : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {loading || submitting ? (
          <div className={styles.tableBusyHint} aria-hidden>
            Обновление…
          </div>
        ) : null}
      </div>
    </>
  );
}
