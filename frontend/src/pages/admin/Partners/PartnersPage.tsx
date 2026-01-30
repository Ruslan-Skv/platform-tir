'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './PartnersPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const STORAGE_KEY = 'partners_table_columns';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('7') && digits.length === 11) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 10) {
    return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }
  return phone;
}

interface ColumnDefinition {
  key: string;
  label: string;
  defaultVisible: boolean;
  render: (partner: Partner) => React.ReactNode;
}

type ColumnKey =
  | 'name'
  | 'logoUrl'
  | 'website'
  | 'email'
  | 'phone'
  | 'productsCount'
  | 'isActive'
  | 'actions';

interface Partner {
  id: string;
  name: string;
  logoUrl?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string[] | null;
  description?: string | null;
  isActive: boolean;
  sortOrder?: number;
  _count?: {
    products: number;
  };
}

export function PartnersPage() {
  const router = useRouter();
  const { getAuthHeaders } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    partner: Partner | null;
  }>({ isOpen: false, partner: null });
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteModal = (partner: Partner) => {
    setDeleteModal({ isOpen: true, partner });
    setDeleteError(null);
  };

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
              href={partner.website}
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
                  {formatPhone(phone)}
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
    [router]
  );

  const loadColumnSettings = useCallback((): ColumnKey[] => {
    const defaultColumns = Object.keys(allColumns).filter(
      (key) => allColumns[key as ColumnKey].defaultVisible
    ) as ColumnKey[];
    if (typeof window === 'undefined') return defaultColumns;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnKey[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.includes('actions') ? parsed : [...parsed, 'actions'];
        }
      }
    } catch {
      // ignore
    }
    return defaultColumns;
  }, [allColumns]);

  const [selectedColumns, setSelectedColumns] = useState<ColumnKey[]>([]);

  useEffect(() => {
    const saved = loadColumnSettings();
    setSelectedColumns(saved.includes('actions') ? saved : [...saved, 'actions']);
  }, [loadColumnSettings]);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const response = await fetch(`${API_URL}/admin/partners?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setPartners(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    } finally {
      setLoading(false);
    }
  }, [search, getAuthHeaders]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, partner: null });
    setDeleteError(null);
  };

  const handleDeletePartner = async () => {
    if (!deleteModal.partner) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch(`${API_URL}/admin/partners/${deleteModal.partner.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        closeDeleteModal();
        fetchPartners();
      } else {
        const data = await response.json().catch(() => ({}));
        setDeleteError(data.message || 'Ошибка при удалении партнёра');
      }
    } catch {
      setDeleteError('Ошибка сети при удалении партнёра');
    } finally {
      setDeleting(false);
    }
  };

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
              {partners.map((partner) => (
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
                onClick={handleDeletePartner}
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
