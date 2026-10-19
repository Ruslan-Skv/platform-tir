'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

import type {
  RepairScheduleProject,
  RepairScheduleProjectStatus,
} from '@/shared/api/crm/admin-repair-schedules';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import dataTableStyles from '@/shared/ui/admin/DataTable/DataTable.module.css';
import { DeleteIcon, EditIcon, PublishIcon } from '@/shared/ui/icons';
import { PackageWorkOrdersHubIcon } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/PackageWorkOrdersHubIcon';
import { formatPackageWorkOrderHubModalTitle } from '@/views/admin/ContractDocuments/packages/platform/hub/workOrders/packageWorkOrderHubTabs';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';

import { RepairDeadlineWarningBadge } from '../shared/RepairDeadlineWarningBadge';
import styles from '../shared/RepairSchedules.module.css';
import {
  REPAIR_STATUS_LABELS,
  formatDate,
  formatMoney,
  packageObjectTexts,
} from '../shared/repair-schedules';
import {
  buildRepairObjectGroups,
  compareRepairProjectsByAge,
  repairObjectGroupStatus,
  repairObjectGroupSumLabel,
} from '../shared/repairObjectGroups';

type Props = {
  items: RepairScheduleProject[];
  statusFilter: RepairScheduleProjectStatus | 'ALL';
  loading: boolean;
  submitting: boolean;
  openProject: (id: string) => void;
  onOpenWorkOrdersHub: (packageId: string) => void;
  /** Запрос смены статуса — страница показывает подтверждающую модалку. */
  moveStatus: (item: RepairScheduleProject, status: 'NEW' | 'IN_PROGRESS' | 'CLOSED') => void;
  onDelete: (item: RepairScheduleProject) => void;
  /** Удаление в корзину доступно только для созданных вручную проектов (без пакета). */
  canDeleteProject: (item: RepairScheduleProject) => boolean;
};

const COL_SPAN = 9;

/** Порядок секций при фильтре «Все»: в работе → новые → закрытые. */
const STATUS_SECTIONS: Array<{ status: RepairScheduleProjectStatus; label: string }> = [
  { status: 'IN_PROGRESS', label: 'В работе' },
  { status: 'NEW', label: 'Новые договора' },
  { status: 'CLOSED', label: 'Закрытые' },
];

type StatusSection = {
  id: string;
  label: string | null;
  count: number;
  groups: ReturnType<typeof buildRepairObjectGroups>;
};

/** Фон строки/карточки по близости окончания срока договора. */
function deadlineRowTint(warning: RepairScheduleProject['deadlineWarning']): string {
  if (warning === 'OVERDUE' || warning === 'D3') return styles.deadlineRowUrgent;
  if (warning === 'D10') return styles.deadlineRowHigh;
  if (warning === 'D20') return styles.deadlineRowSoft;
  return '';
}

/** Дата в бейдже «Закрыт» — с полным годом. */
function formatBadgeDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso.slice(0, 10);
}

/** Бейдж статуса договора; для «Закрыт» дата закрытия — второй строкой (как в ОДПЖ). */
function StatusBadge({ item }: { item: RepairScheduleProject }) {
  const closedDay = item.workCloseActDate || item.closedAt;
  const closedDate = item.status === 'CLOSED' && closedDay ? formatBadgeDate(closedDay) : null;
  return (
    <span
      className={`${styles.badge} ${styles[`badge${item.status}`]}${
        closedDate ? ` ${styles.badgeStacked}` : ''
      }`}
    >
      {closedDate ? (
        <>
          <span>{REPAIR_STATUS_LABELS[item.status]}</span>
          <span>{closedDate}</span>
        </>
      ) : (
        REPAIR_STATUS_LABELS[item.status]
      )}
    </span>
  );
}

function deadlineCardTint(warning: RepairScheduleProject['deadlineWarning']): string {
  if (warning === 'OVERDUE' || warning === 'D3') return styles.deadlineCardUrgent;
  if (warning === 'D10') return styles.deadlineCardHigh;
  if (warning === 'D20') return styles.deadlineCardSoft;
  return '';
}

/** Строка-разделитель между карточками объектов/договоров (как в списке расчётов). */
function CardGapRow() {
  return (
    <tr className={styles.cardGapRow} aria-hidden>
      <td colSpan={COL_SPAN} />
    </tr>
  );
}

export function RepairSchedulesGroupedList({
  items,
  statusFilter,
  loading,
  submitting,
  openProject,
  onOpenWorkOrdersHub,
  moveStatus,
  onDelete,
  canDeleteProject,
}: Props) {
  const sections = useMemo<StatusSection[]>(() => {
    if (statusFilter !== 'ALL') {
      return [
        {
          id: statusFilter,
          label: null,
          count: items.length,
          groups: buildRepairObjectGroups(items),
        },
      ];
    }
    // Блоки объектов сортируем по дате подписания (старые сверху) и раскладываем
    // по секциям агрегатным статусом блока: весь блок объекта — в одном разделе.
    const sorted = [...items].sort((a, b) => compareRepairProjectsByAge(a, b, false));
    const blocks = buildRepairObjectGroups(sorted);
    return STATUS_SECTIONS.map(({ status, label }) => {
      const sectionGroups = blocks.filter((g) => repairObjectGroupStatus(g.projects) === status);
      return {
        id: status,
        label,
        count: sectionGroups.reduce((sum, g) => sum + g.projects.length, 0),
        groups: sectionGroups,
      };
    }).filter((s) => s.count > 0);
  }, [items, statusFilter]);
  const clusterKey = useMemo(
    () =>
      sections
        .flatMap((s) => s.groups)
        .filter((g) => g.isCluster)
        .map((g) => g.id)
        .join('\n'),
    [sections]
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

  const renderActions = (item: RepairScheduleProject) => {
    const packageId = item.packageId;
    return (
      <div className={styles.actions}>
        <AdminTableIconButton
          aria-label="Открыть"
          title="Открыть карточку"
          onClick={() => openProject(item.id)}
        >
          <EditIcon />
        </AdminTableIconButton>
        {packageId ? (
          <AdminTableIconButton
            aria-label="Заказ-наряды"
            title={formatPackageWorkOrderHubModalTitle(item.contractNumber ?? undefined)}
            onClick={() => onOpenWorkOrdersHub(packageId)}
          >
            <PackageWorkOrdersHubIcon />
          </AdminTableIconButton>
        ) : null}
        {!item.packageId && item.status === 'NEW' ? (
          <AdminTableIconButton
            data-admin-mutation
            aria-label="В работу"
            title="Перевести в работу"
            onClick={() => moveStatus(item, 'IN_PROGRESS')}
          >
            <PublishIcon />
          </AdminTableIconButton>
        ) : null}
        {!item.packageId && item.status === 'IN_PROGRESS' ? (
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Закрыть"
            title="Закрыть договор"
            onClick={() => moveStatus(item, 'CLOSED')}
          >
            <PublishIcon />
          </AdminTableIconButton>
        ) : null}
        {canDeleteProject(item) ? (
          <AdminTableIconButton
            data-admin-mutation
            aria-label="Удалить"
            title="Удалить"
            onClick={() => onDelete(item)}
          >
            <DeleteIcon />
          </AdminTableIconButton>
        ) : null}
      </div>
    );
  };

  const renderProjectCells = (item: RepairScheduleProject, hideCustomer: boolean) => {
    const { objectDescription, managerNote } = packageObjectTexts(item.package);
    return (
      <>
        <td>
          <button
            type="button"
            className={styles.contractCell}
            onClick={() => openProject(item.id)}
          >
            <strong>{item.contractNumber || 'Без номера'}</strong>
            {objectDescription ? (
              <span className={styles.subline} title={objectDescription}>
                {objectDescription}
              </span>
            ) : null}
            {item.workScope ? <span className={styles.subline}>{item.workScope}</span> : null}
          </button>
        </td>
        <td>
          <div className={styles.cellMain}>
            <div>{item.installerName || '—'}</div>
            {(item.attachedInstallers ?? []).length > 0 ? (
              <span
                className={styles.subline}
                title="Мастера, прикреплённые в модалке «Заказ-наряды» договора"
              >
                {item.attachedInstallers!.map((m) => m.fullName).join(', ')}
              </span>
            ) : null}
          </div>
        </td>
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
            <RepairDeadlineWarningBadge
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
        <td className={styles.noteCell} title={managerNote ?? undefined}>
          {managerNote ?? '—'}
        </td>
        <td>
          <StatusBadge item={item} />
        </td>
        <td>{renderActions(item)}</td>
      </>
    );
  };

  const renderMobileCard = (item: RepairScheduleProject) => {
    const { objectDescription, managerNote } = packageObjectTexts(item.package);
    return (
      <article
        key={item.id}
        className={`${styles.mobileCard} ${deadlineCardTint(item.deadlineWarning)}`}
      >
        <div className={styles.mobileCardTop}>
          <div>
            <div className={styles.mobileCardName}>{item.contractNumber || 'Без номера'}</div>
            {objectDescription ? (
              <div className={styles.mobileCardMeta}>{objectDescription}</div>
            ) : null}
            <div className={styles.mobileCardMeta}>
              {item.installerName || 'Без мастера'}
              {item.workScope ? ` · ${item.workScope}` : ''}
            </div>
            {(item.attachedInstallers ?? []).length > 0 ? (
              <div className={styles.mobileCardMeta}>
                {item.attachedInstallers!.map((m) => m.fullName).join(', ')}
              </div>
            ) : null}
          </div>
          <StatusBadge item={item} />
        </div>
        {item.customerName || item.customerAddress ? (
          <div className={styles.mobileCardMeta}>
            {[item.customerName, item.customerAddress].filter(Boolean).join(' · ')}
          </div>
        ) : null}
        {managerNote ? (
          <div className={styles.mobileCardMeta}>Примечание: {managerNote}</div>
        ) : null}
        {item.latestEntry ? (
          <div className={styles.mobileCardMeta}>
            {formatDate(item.latestEntry.date)}: {item.latestEntry.text.slice(0, 100)}
          </div>
        ) : null}
        {item.calculatedEndDate ? (
          <div className={styles.mobileCardMeta}>Срок: {formatDate(item.calculatedEndDate)}</div>
        ) : null}
        <RepairDeadlineWarningBadge level={item.deadlineWarning} daysLeft={item.deadlineDaysLeft} />
        {item.stale ? (
          <div className={styles.stale}>Нет записи &gt; {item.staleDays} дн.</div>
        ) : null}
        <div className={styles.mobileCardActions}>
          <div className={styles.actions}>
            <AdminTableIconButton
              aria-label="Открыть"
              title="Открыть"
              onClick={() => openProject(item.id)}
            >
              <EditIcon />
            </AdminTableIconButton>
            {item.packageId ? (
              <AdminTableIconButton
                aria-label="Заказ-наряды"
                title={formatPackageWorkOrderHubModalTitle(item.contractNumber ?? undefined)}
                onClick={() => {
                  if (item.packageId) onOpenWorkOrdersHub(item.packageId);
                }}
              >
                <PackageWorkOrdersHubIcon />
              </AdminTableIconButton>
            ) : null}
          </div>
        </div>
      </article>
    );
  };

  if (loading && items.length === 0) {
    return (
      <>
        <div className={styles.mobileCards} aria-label="Проекты ремонта">
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
        <div className={styles.mobileCards} aria-label="Проекты ремонта">
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
      <div className={styles.mobileCards} aria-label="Проекты ремонта">
        {sections.map((section) => (
          <Fragment key={section.id}>
            {section.label ? (
              <p
                className={`${styles.mobileStatusSectionTitle} ${styles[`mobileStatusSectionTitle${section.id}`]}`}
              >
                {section.label} ({section.count})
              </p>
            ) : null}
            {section.groups.map((group) => {
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
                        {[
                          ...group.customerNames,
                          ...group.addresses.filter((a) => a !== group.label),
                        ]
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
          </Fragment>
        ))}
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
                  <th>Примечание</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) => (
                  <Fragment key={section.id}>
                    {section.label ? (
                      <tr
                        className={`${styles.statusSectionRow} ${styles[`statusSectionRow${section.id}`]}`}
                      >
                        <td colSpan={COL_SPAN}>
                          {section.label} ({section.count})
                        </td>
                      </tr>
                    ) : null}
                    {section.groups.map((group) => {
                      if (!group.isCluster) {
                        const item = group.projects[0];
                        return (
                          <Fragment key={item.id}>
                            <tr
                              className={`${dataTableStyles.row} ${styles.standaloneCardRow} ${deadlineRowTint(item.deadlineWarning)}`}
                            >
                              {renderProjectCells(item, false)}
                            </tr>
                            <CardGapRow />
                          </Fragment>
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
                            } ${styles.objectGroupRow} ${
                              expanded
                                ? styles.objectGroupRowExpanded
                                : styles.objectGroupRowCollapsed
                            }`}
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
                                      <span className={cdBase.contractsListObjectKindChip}>
                                        Объект
                                      </span>
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
                                      {repairObjectGroupSumLabel(group.projects)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                          {expanded
                            ? group.projects.map((item, index) => (
                                <tr
                                  key={item.id}
                                  className={`${dataTableStyles.row} ${styles.objectChildRow} ${
                                    index === group.projects.length - 1
                                      ? styles.objectChildRowLast
                                      : ''
                                  } ${deadlineRowTint(item.deadlineWarning)}`}
                                >
                                  {renderProjectCells(item, true)}
                                </tr>
                              ))
                            : null}
                          <CardGapRow />
                        </Fragment>
                      );
                    })}
                  </Fragment>
                ))}
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
