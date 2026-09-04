'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  type ClientDirectoryRow,
  type CrmCustomerDetail,
  getClientDirectory,
  getCrmCustomer,
} from '@/shared/api/admin-crm';

import { crmDetailWithPreferredObjectAddress } from '../shared/crmCustomerExtendedProfile';
import { getCrmCustomerFillBannerToneClass } from '../shared/crmCustomerFillPercent';
import { formatCrmPhoneOrDash } from '../shared/crmCustomerPhone';
import { AddCrmCustomerModal } from './AddCrmCustomerModal';
import { CrmCustomerDetailModal } from './CrmCustomerDetailModal';
import styles from './CrmCustomerSearchPanel.module.css';

function isCreatedCrmCustomer(x: unknown): x is { id: string } {
  return typeof x === 'object' && x !== null && typeof (x as { id?: unknown }).id === 'string';
}

/** Контекст выбора из строки справочника (подпись как в результатах поиска). */
export type CrmCustomerAppliedContext = {
  displayName?: string;
};

export type CrmCustomerSearchPanelProps = {
  customerId: string | null;
  disabled?: boolean;
  listboxId?: string;
  className?: string;
  onCustomerApplied: (detail: CrmCustomerDetail, context?: CrmCustomerAppliedContext) => void;
  onClear: () => void;
  onError?: (message: string) => void;
  /**
   * Показать «Снять выбор», даже если `customerId` пуст
   * (например в форме договора остались поля заказчика без привязки к карточке).
   */
  showClearButton?: boolean;
  addCustomerDraft?: {
    fullName?: string;
    phone?: string;
    objectAddress?: string;
  };
};

export function CrmCustomerSearchPanel({
  customerId,
  disabled = false,
  listboxId = 'customer-crm-search-listbox',
  className,
  onCustomerApplied,
  onClear,
  onError,
  showClearButton = false,
  addCustomerDraft,
}: CrmCustomerSearchPanelProps) {
  const [crmSearchInput, setCrmSearchInput] = useState('');
  const [crmSearchDebounced, setCrmSearchDebounced] = useState('');
  const [crmSearchResults, setCrmSearchResults] = useState<ClientDirectoryRow[]>([]);
  const [crmSearchLoading, setCrmSearchLoading] = useState(false);
  const [crmSearchError, setCrmSearchError] = useState<string | null>(null);
  const [addCrmCustomerOpen, setAddCrmCustomerOpen] = useState(false);
  const [crmDetailCustomerId, setCrmDetailCustomerId] = useState<string | null>(null);

  const notifyError = useCallback(
    (text: string) => {
      onError?.(text);
    },
    [onError]
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setCrmSearchDebounced(crmSearchInput.trim());
    }, 380);
    return () => window.clearTimeout(t);
  }, [crmSearchInput]);

  const reloadCrmSearchResults = useCallback(() => {
    const q = crmSearchDebounced;
    if (q.length < 2) {
      setCrmSearchResults([]);
      setCrmSearchError(null);
      return Promise.resolve();
    }
    setCrmSearchLoading(true);
    setCrmSearchError(null);
    return getClientDirectory({ search: q, limit: 30, page: 1, expandObjectAddresses: true })
      .then((res) => {
        setCrmSearchResults((res.data ?? []).filter((row) => row.rowSource === 'customer'));
      })
      .catch((e) => {
        setCrmSearchError(e instanceof Error ? e.message : 'Ошибка поиска');
      })
      .finally(() => {
        setCrmSearchLoading(false);
      });
  }, [crmSearchDebounced]);

  useEffect(() => {
    const q = crmSearchDebounced;
    if (q.length < 2) {
      setCrmSearchResults([]);
      setCrmSearchError(null);
      return;
    }
    let cancelled = false;
    setCrmSearchLoading(true);
    setCrmSearchError(null);
    getClientDirectory({ search: q, limit: 30, page: 1, expandObjectAddresses: true })
      .then((res) => {
        if (!cancelled) {
          setCrmSearchResults((res.data ?? []).filter((row) => row.rowSource === 'customer'));
        }
      })
      .catch((e) => {
        if (!cancelled) setCrmSearchError(e instanceof Error ? e.message : 'Ошибка поиска');
      })
      .finally(() => {
        if (!cancelled) setCrmSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [crmSearchDebounced]);

  const applyDirectoryRow = useCallback(
    async (row: ClientDirectoryRow) => {
      if (disabled || row.rowSource !== 'customer') return;
      try {
        const detail = await getCrmCustomer(row.id);
        onCustomerApplied(crmDetailWithPreferredObjectAddress(detail, row.objectAddress), {
          displayName: row.displayName,
        });
        setCrmSearchResults([]);
        setCrmSearchInput('');
        setCrmSearchDebounced('');
      } catch {
        notifyError('Не удалось загрузить карточку заказчика');
      }
    },
    [disabled, notifyError, onCustomerApplied]
  );

  const handleClearSelection = useCallback(() => {
    if (disabled) return;
    onClear();
    setCrmSearchResults([]);
    setCrmSearchInput('');
    setCrmSearchDebounced('');
  }, [disabled, onClear]);

  return (
    <>
      <article className={[styles.customerCrmPanel, className].filter(Boolean).join(' ')}>
        <div className={styles.customerCrmPanelHead}>
          <div>
            <h3 className={styles.customerCrmTitle}>Поиск заказчика в базе</h3>
            <p className={styles.customerCrmHint}>
              Найдите карточку в базе или добавьте новую — поля заказчика заполнятся автоматически.
            </p>
          </div>
          {customerId ? (
            <span className={styles.customerCrmLinkedBadge}>Карточка выбрана</span>
          ) : null}
        </div>
        <div className={styles.customerCrmActions}>
          <button
            data-admin-mutation
            type="button"
            className={styles.customerCrmAddButton}
            disabled={disabled}
            onClick={() => setAddCrmCustomerOpen(true)}
          >
            + Добавить нового заказчика
          </button>
        </div>
        <div className={styles.customerCrmSearchWrap}>
          <div className={styles.customerCrmSearchRow}>
            <input
              type="search"
              className={`${styles.searchInput} ${styles.customerCrmSearchInput}`}
              placeholder="Поиск: ФИО, телефон, адрес…"
              value={crmSearchInput}
              onChange={(e) => setCrmSearchInput(e.target.value)}
              autoComplete="off"
              disabled={disabled}
              aria-label="Поиск заказчика в базе по ФИО, телефону, e-mail, компании или адресу объекта (от 2 символов)"
              aria-expanded={crmSearchDebounced.length >= 2}
              aria-controls={listboxId}
            />
            {customerId || showClearButton ? (
              <button
                type="button"
                className={styles.customerCrmClearButton}
                disabled={disabled}
                onClick={handleClearSelection}
              >
                Снять выбор
              </button>
            ) : null}
          </div>
          {crmSearchDebounced.length >= 2 ? (
            <div className={styles.customerCrmDropdown} id={listboxId} role="presentation">
              {crmSearchLoading ? <p className={styles.customerCrmMuted}>Поиск…</p> : null}
              {crmSearchError ? (
                <p className={styles.customerCrmError} role="alert">
                  {crmSearchError}
                </p>
              ) : null}
              {!crmSearchLoading && !crmSearchError && crmSearchResults.length === 0 ? (
                <p className={styles.customerCrmMuted}>Ничего не найдено</p>
              ) : null}
              {!crmSearchLoading && !crmSearchError && crmSearchResults.length > 0 ? (
                <ul
                  className={styles.customerCrmResults}
                  role="listbox"
                  aria-label="Результаты поиска"
                >
                  {crmSearchResults.map((row) => {
                    const fillPercent =
                      row.profileFillPercent != null ? Math.round(row.profileFillPercent) : 0;
                    const fillComplete = fillPercent >= 100;
                    const rowKey = row.directoryRowKey ?? row.id;
                    const objectAddr = row.objectAddress?.trim();
                    return (
                      <li key={rowKey} role="option" className={styles.customerCrmResultItem}>
                        <button
                          type="button"
                          className={styles.customerCrmResultButton}
                          disabled={disabled}
                          onClick={() => void applyDirectoryRow(row)}
                        >
                          <span className={styles.customerCrmResultName}>{row.displayName}</span>
                          <span className={styles.customerCrmResultMeta}>
                            {[row.phone ? formatCrmPhoneOrDash(row.phone) : null, row.email]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          {objectAddr ? (
                            <span className={styles.customerCrmResultObjectAddress}>
                              Объект: {objectAddr}
                            </span>
                          ) : null}
                        </button>
                        <div className={styles.customerCrmResultAside}>
                          <span
                            className={`${styles.customerCrmResultFill} ${getCrmCustomerFillBannerToneClass(fillPercent)}`}
                          >
                            Карточка {fillPercent}%
                          </span>
                          {!fillComplete ? (
                            <button
                              type="button"
                              className={styles.customerCrmResultEditBtn}
                              disabled={disabled}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCrmDetailCustomerId(row.id);
                              }}
                            >
                              Дозаполнить
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      <CrmCustomerDetailModal
        customerId={crmDetailCustomerId}
        isOpen={Boolean(crmDetailCustomerId)}
        onClose={() => setCrmDetailCustomerId(null)}
        onUpdated={async () => {
          await reloadCrmSearchResults();
          if (crmDetailCustomerId && crmDetailCustomerId === customerId) {
            try {
              const detail = await getCrmCustomer(crmDetailCustomerId);
              onCustomerApplied(detail);
            } catch {
              notifyError('Не удалось обновить данные заказчика');
            }
          }
        }}
      />

      <AddCrmCustomerModal
        isOpen={addCrmCustomerOpen}
        onClose={() => setAddCrmCustomerOpen(false)}
        initialDraft={customerId ? undefined : addCustomerDraft}
        onCreated={async (created) => {
          if (!isCreatedCrmCustomer(created)) return;
          try {
            const detail = await getCrmCustomer(created.id);
            onCustomerApplied(detail);
          } catch {
            notifyError('Заказчик создан, но не удалось загрузить карточку');
          }
          setAddCrmCustomerOpen(false);
        }}
      />
    </>
  );
}
