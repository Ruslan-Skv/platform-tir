'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type ContractDocumentPackage,
  createContractDocumentPackage,
  deleteContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';

import styles from '../ContractDocuments.module.css';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function RepairContractDocumentsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ContractDocumentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Удалить «${label}»?`)) return;
    setError(null);
    try {
      await deleteContractDocumentPackage(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось удалить');
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Оформление договоров — Ремонт</h1>
      <p className={styles.subtitle}>
        Создавайте пакет документов: вкладка «Данные» для ввода, остальные вкладки подставляют
        значения в шаблоны.
      </p>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.primaryBtn}
          disabled={creating}
          onClick={() => void handleCreate()}
        >
          {creating ? 'Создание…' : 'Новый пакет документов'}
        </button>
        <Link className={styles.secondaryBtn} href="/admin/contract-documents">
          Все направления
        </Link>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {loading ? (
        <p className={styles.hint}>Загрузка…</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название / ID</th>
                <th>Договор CRM</th>
                <th>Обновлён</th>
                <th>Автор</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--admin-text-muted)' }}>
                    Пока нет ни одного пакета. Нажмите «Новый пакет документов».
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const label = r.title?.trim() || r.id;
                  const author =
                    r.createdBy &&
                    [r.createdBy.lastName, r.createdBy.firstName].filter(Boolean).join(' ').trim();
                  return (
                    <tr key={r.id}>
                      <td>
                        <div className={styles.packageTitleCell}>
                          <Link
                            className={styles.link}
                            href={`/admin/contract-documents/repair/${r.id}`}
                          >
                            {label}
                          </Link>
                          {r.status === 'CONTRACT_CONCLUDED' ? (
                            <span className={styles.packageFlowStatusBadge} role="status">
                              Договор подписан
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {r.crmContract ? (
                          <Link
                            className={styles.link}
                            href={`/admin/crm/contracts/${r.crmContract.id}`}
                          >
                            № {r.crmContract.contractNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{formatDate(r.updatedAt)}</td>
                      <td>{author || r.createdBy?.email || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.dangerBtn}
                          onClick={() => void handleDelete(r.id, label)}
                        >
                          Удалить
                        </button>
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
  );
}
