'use client';

import { useEffect, useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './PartnersPage.module.css';
import type { PartnersPageModel } from './hooks/usePartnersPage';
import type { ColumnDefinition, ColumnKey, Partner } from './partners-page.types';
import { formatPartnerPhone } from './partners-page.utils';

type PartnersPageViewProps = {
  model: PartnersPageModel;
};

export function PartnersPageView({ model }: PartnersPageViewProps) {
  const router = useRouter();
  const {
    partners,
    loading,
    search,
    setSearch,
    deleteModal,
    deleting,
    deleteError,
    selectedColumns,
    initColumnSettings,
    openDeleteModal,
    closeDeleteModal,
    handleDeletePartner,
  } = model;

  const allColumns = useMemo<Record<ColumnKey, ColumnDefinition>>(
    () => ({
      name: {
        key: 'name',
        label: 'Название',
        defaultVisible: true,
        render: (partner) => <div className={styles.partnerName}>{partner.name}</div>,
      },
      logoUrl: {
        key: 'logoUrl',
        label: 'Логотип',
        defaultVisible: true,
        render: (partner) =>
          partner.logoUrl ? (
            <img
              src={partner.logoUrl}
              alt={partner.name}
              className={styles.logoPreview}
              width={32}
              height={32}
            />
          ) : (
            <span className={styles.emptyValue}>—</span>
          ),
      },
      website: {
        key: 'website',
        label: 'Сайт',
        defaultVisible: true,
        render: (partner) =>
          partner.website ? (
            <a
              href={getSafeHref(partner.website)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.websiteLink}
            >
              {partner.website}
            </a>
          ) : (
            <span className={styles.emptyValue}>—</span>
          ),
      },
      email: {
        key: 'email',
        label: 'Email',
        defaultVisible: true,
        render: (partner) =>
          partner.email ? (
            <a href={`mailto:${partner.email}`} className={styles.emailLink}>
              {partner.email}
            </a>
          ) : (
            <span className={styles.emptyValue}>—</span>
          ),
      },
      phone: {
        key: 'phone',
        label: 'Телефоны',
        defaultVisible: true,
        render: (partner) =>
          partner.phone && partner.phone.length > 0 ? (
            <div className={styles.phonesList}>
              {partner.phone.map((phone, index) => (
                <a
                  key={index}
                  href={`tel:${phone.replace(/\s/g, '')}`}
                  className={styles.phoneLink}
                >
                  {formatPartnerPhone(phone)}
                </a>
              ))}
            </div>
          ) : (
            <span className={styles.emptyValue}>—</span>
          ),
      },
      productsCount: {
        key: 'productsCount',
        label: 'Товаров',
        defaultVisible: true,
        render: (partner) => (
          <span className={styles.productCount}>{partner._count?.products || 0}</span>
        ),
      },
      isActive: {
        key: 'isActive',
        label: 'Статус',
        defaultVisible: true,
        render: (partner) =>
          partner.isActive ? (
            <span className={styles.activeBadge}>Активен</span>
          ) : (
            <span className={styles.inactiveBadge}>Неактивен</span>
          ),
      },
      actions: {
        key: 'actions',
        label: 'Действия',
        defaultVisible: true,
        render: (partner) => (
          <div className={styles.actions}>
            <button
              className={styles.editButton}
              onClick={() => router.push(`/admin/partners/${partner.id}/edit`)}
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              className={styles.deleteButton}
              onClick={() => openDeleteModal(partner)}
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        ),
      },
    }),
    [router, openDeleteModal]
  );

  useEffect(() => {
    const defaultColumns = Object.keys(allColumns).filter(
      (key) => allColumns[key as ColumnKey].defaultVisible
    ) as ColumnKey[];
    initColumnSettings(defaultColumns);
  }, [allColumns, initColumnSettings]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Загрузка партнёров...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Партнёры</h1>
        <div className={styles.headerActions}>
          <button className={styles.addButton} onClick={() => router.push('/admin/partners/new')}>
            + Добавить партнёра
          </button>
        </div>
      </div>

      <div className={styles.searchSection}>
        <input
          type="text"
          placeholder="Поиск по названию, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {partners.length === 0 ? (
        <div className={styles.empty}>
          <p>Партнёры не найдены</p>
          <button className={styles.addButton} onClick={() => router.push('/admin/partners/new')}>
            Добавить первого партнёра
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {selectedColumns.map((columnKey) => (
                  <th key={columnKey}>{allColumns[columnKey].label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partners.map((partner: Partner) => (
                <tr key={partner.id}>
                  {selectedColumns.map((columnKey) => (
                    <td key={columnKey}>{allColumns[columnKey].render(partner)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteModal.isOpen && deleteModal.partner && (
        <div className={styles.modalOverlay} onClick={closeDeleteModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Удаление партнёра</h2>
              <button className={styles.modalClose} onClick={closeDeleteModal}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.warningBox}>
                <p className={styles.warningText}>Вы уверены, что хотите удалить партнёра?</p>
                <p className={styles.partnerToDelete}>{deleteModal.partner.name}</p>
                {deleteModal.partner._count && deleteModal.partner._count.products > 0 && (
                  <p className={styles.warningSubtext}>
                    Внимание: у этого партнёра есть {deleteModal.partner._count.products} связанных
                    товаров.
                  </p>
                )}
              </div>
              {deleteError && <div className={styles.errorMessage}>{deleteError}</div>}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                className={styles.dangerButton}
                onClick={() => void handleDeletePartner()}
                disabled={deleting}
              >
                {deleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
