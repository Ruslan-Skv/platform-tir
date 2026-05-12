'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ContractDocumentPackage,
  createContractDocumentPackage,
  deleteContractDocumentPackage,
  getContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';

import styles from '../ContractDocuments.module.css';
import { buildFormDataForRepairPackageCopy } from './cloneRepairPackageFormDataForCopy';
import {
  REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY,
  getDisplayContractNumber,
} from './packageContractDisplay';

const listMoneyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 0,
});

function parseAmountToNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatListMoney(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return listMoneyFormatter.format(n);
}

function sumPackagePaymentsRub(pkg: ContractDocumentPackage): number {
  let s = 0;
  for (const p of pkg.payments ?? []) {
    const n = parseAmountToNumber(p.amount);
    if (n != null) s += n;
  }
  return s;
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function repairListContractTotalAmount(fd: Record<string, unknown>): number | null {
  return parseAmountToNumber(asObj(fd.contract)?.totalAmount);
}

function repairListCustomerName(fd: Record<string, unknown>): string {
  const c = asObj(fd.customer);
  if (!c) return '—';
  const type = c.type;
  if (type === 'COMPANY' || type === 'ENTREPRENEUR') {
    const org = String(c.organizationName ?? '').trim();
    return org || '—';
  }
  return String(c.fullName ?? '').trim() || '—';
}

function repairListObjectAddress(fd: Record<string, unknown>): string {
  const o = asObj(fd.object);
  return String(o?.objectAddress ?? '').trim() || '—';
}

function repairListWorkDescription(fd: Record<string, unknown>): string {
  const o = asObj(fd.object);
  const objDesc = String(o?.objectDescription ?? '').trim();
  if (objDesc) return objDesc;
  const q = asObj(fd.managerQuestionnaire1);
  return String(q?.orderInfo ?? '').trim() || '—';
}

function formatSigningDateOnly(r: ContractDocumentPackage): string {
  if (r.status !== 'CONTRACT_CONCLUDED') return '—';
  const fd = r.formData ?? {};
  const iso = typeof fd.contractConcludedAt === 'string' ? fd.contractConcludedAt.trim() : '';
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

function ellipsizeOneLine(s: string, maxLen: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

/** Черновик без сохранений после создания: одна версия в журнале и нет оплат. */
function repairPackageDraftDeletionAllowed(pkg: ContractDocumentPackage): boolean {
  const versionCount = pkg._count?.versions ?? 1;
  const paymentCount = pkg.payments?.length ?? 0;
  return versionCount === 1 && paymentCount === 0;
}

export function RepairContractDocumentsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ContractDocumentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copyingPackageId, setCopyingPackageId] = useState<string | null>(null);
  const [deletingPackageId, setDeletingPackageId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContractDocumentPackages('REPAIR');
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const title =
      typeof window !== 'undefined'
        ? (window.prompt('Название черновика (необязательно):', '') ?? '')
        : '';
    setCreating(true);
    setError(null);
    try {
      const created = await createContractDocumentPackage({
        kind: 'REPAIR',
        title: title.trim() || undefined,
        formData: {},
      });
      router.push(`/admin/contract-documents/repair/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyPackage = async (packageId: string) => {
    setCopyingPackageId(packageId);
    setError(null);
    try {
      const pkg = await getContractDocumentPackage(packageId);
      const formDataBase = buildFormDataForRepairPackageCopy(pkg.formData);
      const contractBlock = asObj(formDataBase.contract);
      const baselineNumber =
        typeof contractBlock?.number === 'string' ? contractBlock.number.trim() : '';
      const formData = {
        ...formDataBase,
        [REPAIR_COPY_CONTRACT_NUMBER_BASELINE_KEY]: baselineNumber,
      };
      const baseTitle = pkg.title?.trim();
      const created = await createContractDocumentPackage({
        kind: 'REPAIR',
        title: baseTitle ? `${baseTitle} (копия)` : undefined,
        formData,
      });
      await load();
      router.push(`/admin/contract-documents/repair/${created.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось скопировать договор');
    } finally {
      setCopyingPackageId(null);
    }
  };

  const handleDeletePackage = async (pkg: ContractDocumentPackage) => {
    if (!repairPackageDraftDeletionAllowed(pkg)) return;
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(
            'Удалить этот черновик договора? Действие необратимо. Удаление доступно только пока не было сохранений после создания.'
          )
        : false;
    if (!ok) return;
    setDeletingPackageId(pkg.id);
    setError(null);
    try {
      await deleteContractDocumentPackage(pkg.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить пакет');
    } finally {
      setDeletingPackageId(null);
    }
  };

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={styles.editorHeader}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents">
            ← К разделу «Оформление договоров»
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            Оформление договоров — Ремонт
          </h1>
          <p
            className={styles.hubCardHint}
            style={{ marginTop: 6, marginBottom: 0, maxWidth: 720 }}
          >
            Создавайте пакет документов: вкладка «Данные» для ввода, остальные вкладки подставляют
            значения в шаблоны.
          </p>
        </div>
        <div className={styles.headerButtonsRow}>
          <button
            type="button"
            className={`${styles.secondaryBtn} ${styles.estimatesPageRefreshIconBtn}`}
            disabled={
              loading || creating || copyingPackageId !== null || deletingPackageId !== null
            }
            aria-busy={loading}
            aria-label={loading ? 'Обновление списка договоров' : 'Обновить список договоров'}
            title="Обновить список"
            onClick={() => void load()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? styles.estimatesRefreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div
        className={`${styles.sectionCard} ${styles.estimatesListSection}`}
        style={{ marginBottom: 10 }}
      >
        <div className={styles.estimatesControlsSingleRow}>
          <button
            type="button"
            className={styles.primaryBtn}
            disabled={
              creating || loading || copyingPackageId !== null || deletingPackageId !== null
            }
            onClick={() => void handleCreate()}
          >
            {creating ? 'Создание…' : 'Новый пакет документов'}
          </button>
          <Link
            className={styles.secondaryBtn}
            href="/admin/contract-documents"
            style={{ textDecoration: 'none' }}
          >
            Все направления
          </Link>
          <div className={styles.estimatesFilterRowSpacer} aria-hidden />
        </div>

        {loading ? (
          <p className={styles.hint} style={{ margin: 'var(--admin-space-md) 0 0' }}>
            Загрузка…
          </p>
        ) : (
          <div className={styles.tableWrap} style={{ marginTop: 'var(--admin-space-md)' }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>№ договора</th>
                  <th>Дата подписания</th>
                  <th>ФИО заказчика</th>
                  <th>Адрес объекта</th>
                  <th>Описание работ</th>
                  <th>Стоимость договора</th>
                  <th>Оплачено</th>
                  <th className={styles.repairContractsListActionsCol}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ color: 'var(--admin-text-muted)' }}>
                      Пока нет ни одного пакета. Нажмите «Новый пакет документов».
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const fd = r.formData ?? {};
                    const num = getDisplayContractNumber({ formData: fd });
                    const paidRub = sumPackagePaymentsRub(r);
                    const totalRub = repairListContractTotalAmount(fd);
                    const workDesc = repairListWorkDescription(fd);
                    const workShort = ellipsizeOneLine(workDesc, 100);
                    const copyBusy = copyingPackageId === r.id;
                    const deleteBusy = deletingPackageId === r.id;
                    const canDeleteDraft = repairPackageDraftDeletionAllowed(r);
                    return (
                      <tr key={r.id}>
                        <td>
                          <Link
                            className={styles.link}
                            href={`/admin/contract-documents/repair/${r.id}`}
                          >
                            {num}
                          </Link>
                        </td>
                        <td>{formatSigningDateOnly(r)}</td>
                        <td>{repairListCustomerName(fd)}</td>
                        <td>{ellipsizeOneLine(repairListObjectAddress(fd), 64)}</td>
                        <td title={workDesc.length > workShort.length ? workDesc : undefined}>
                          {workShort}
                        </td>
                        <td>{formatListMoney(totalRub)}</td>
                        <td>{formatListMoney(paidRub)}</td>
                        <td className={styles.repairContractsListActionsCol}>
                          <div
                            className={`${styles.estimatesCardActions} ${styles.repairContractsListActionsCell}`}
                          >
                            <button
                              type="button"
                              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                              disabled={
                                loading ||
                                creating ||
                                copyingPackageId !== null ||
                                deletingPackageId !== null
                              }
                              aria-label="Редактировать"
                              title="Редактировать"
                              onClick={() =>
                                router.push(`/admin/contract-documents/repair/${r.id}`)
                              }
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={14}
                                height={14}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--admin-chart-series-1)"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                              disabled={
                                loading ||
                                creating ||
                                (copyingPackageId !== null && !copyBusy) ||
                                deletingPackageId !== null
                              }
                              aria-busy={copyBusy}
                              aria-label={
                                copyBusy
                                  ? 'Копирование договора…'
                                  : 'Копировать договор (данные без прикреплённых расчётов)'
                              }
                              title="Копировать: все вкладки, без расчётов в смете и в Д/с"
                              onClick={() => void handleCopyPackage(r.id)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={14}
                                height={14}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--admin-chart-series-2)"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={
                                  copyBusy ? styles.estimatesRefreshIconSpinning : undefined
                                }
                                aria-hidden
                              >
                                <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className={`${styles.secondaryBtn} ${styles.estimatesIconBtn}`}
                              disabled={
                                !canDeleteDraft ||
                                loading ||
                                creating ||
                                copyingPackageId !== null ||
                                (deletingPackageId !== null && !deleteBusy)
                              }
                              aria-busy={deleteBusy}
                              aria-label={
                                deleteBusy
                                  ? 'Удаление черновика…'
                                  : canDeleteDraft
                                    ? 'Удалить черновик'
                                    : 'Удаление недоступно: уже есть сохранения или оплаты'
                              }
                              title={
                                canDeleteDraft
                                  ? 'Удалить черновик (только если не было сохранений после создания и нет оплат)'
                                  : 'Удалить можно только черновик без сохранений после создания и без оплат в журнале'
                              }
                              onClick={() => void handleDeletePackage(r)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width={14}
                                height={14}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="var(--admin-chart-series-6)"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={
                                  deleteBusy ? styles.estimatesRefreshIconSpinning : undefined
                                }
                                aria-hidden
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
