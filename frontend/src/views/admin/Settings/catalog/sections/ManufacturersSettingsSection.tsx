'use client';

import React, { useCallback, useEffect, useState } from 'react';

import {
  type AdminManufacturer,
  createAdminManufacturer,
  deleteAdminManufacturer,
  fetchAdminManufacturersList,
  updateAdminManufacturer,
} from '@/shared/api/admin-manufacturers';

import styles from '../../shared/ManufacturersSettingsSection.module.css';

function slugifyName(name: string): string {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  };
  return name
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function ManufacturersSettingsSection() {
  const [rows, setRows] = useState<AdminManufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  /** Пока true — slug пересчитывается из названия; сбрасывается при ручном редактировании slug. */
  const [autoNewSlug, setAutoNewSlug] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ name: '', slug: '', country: '', isActive: true });

  const showToast = useCallback((text: string, type: 'ok' | 'err') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminManufacturersList({ limit: 500 });
      setRows(data);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка загрузки', 'err');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      showToast('Введите название', 'err');
      return;
    }
    const slug = (newSlug.trim() || slugifyName(name)).trim();
    if (!slug) {
      showToast('Укажите slug или корректное название', 'err');
      return;
    }
    setSaving(true);
    try {
      await createAdminManufacturer({ name, slug, isActive: true });
      setNewName('');
      setNewSlug('');
      setAutoNewSlug(true);
      await load();
      showToast('Производитель добавлен', 'ok');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'err');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: AdminManufacturer) => {
    setEditId(r.id);
    setEditDraft({
      name: r.name,
      slug: r.slug,
      country: r.country ?? '',
      isActive: r.isActive,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      await updateAdminManufacturer(id, {
        name: editDraft.name.trim(),
        slug: editDraft.slug.trim(),
        country: editDraft.country.trim() || null,
        isActive: editDraft.isActive,
      });
      setEditId(null);
      await load();
      showToast('Сохранено', 'ok');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка', 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: AdminManufacturer) => {
    const n = r._count?.products ?? 0;
    const msg =
      n > 0
        ? `Удалить «${r.name}»? У ${n} товаров поле производителя будет очищено.`
        : `Удалить «${r.name}»?`;
    if (!confirm(msg)) return;
    setSaving(true);
    try {
      await deleteAdminManufacturer(r.id);
      await load();
      showToast('Удалено', 'ok');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Ошибка удаления', 'err');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className={styles.loading}>Загрузка…</p>;
  }

  return (
    <div className={styles.root}>
      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'ok' ? styles.toastOk : styles.toastErr}`}
        >
          {toast.text}
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={`${styles.field} ${styles.fieldName}`}>
          <label htmlFor="mfg-new-name">Название</label>
          <input
            id="mfg-new-name"
            className={styles.input}
            value={newName}
            onChange={(e) => {
              const v = e.target.value;
              setNewName(v);
              if (autoNewSlug) {
                setNewSlug(slugifyName(v));
              }
            }}
            placeholder="Например, Veka"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="mfg-new-slug">Slug (URL)</label>
          <input
            id="mfg-new-slug"
            className={styles.input}
            value={newSlug}
            onChange={(e) => {
              const v = e.target.value;
              setNewSlug(v);
              setAutoNewSlug(v === '');
            }}
            placeholder="veka"
          />
        </div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => void handleAdd()}
          disabled={saving}
        >
          Добавить
        </button>
      </div>
      <p className={styles.hint}>
        Slug должен быть уникальным. При вводе названия он подставляется автоматически; при
        необходимости отредактируйте slug вручную. В карточке товара производитель выбирается из
        этого справочника.
      </p>

      {rows.length === 0 ? (
        <p className={styles.empty}>Производителей пока нет — добавьте первую позицию выше.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Название</th>
                <th>Slug</th>
                <th>Страна</th>
                <th>Активен</th>
                <th className={styles.num}>Товаров</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {editId === r.id ? (
                    <>
                      <td>
                        <input
                          className={styles.inputInline}
                          value={editDraft.name}
                          onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.inputInline}
                          value={editDraft.slug}
                          onChange={(e) => setEditDraft((d) => ({ ...d, slug: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.inputInline}
                          value={editDraft.country}
                          onChange={(e) => setEditDraft((d) => ({ ...d, country: e.target.value }))}
                          placeholder="—"
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={editDraft.isActive}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, isActive: e.target.checked }))
                          }
                        />
                      </td>
                      <td className={styles.num}>{r._count?.products ?? '—'}</td>
                      <td className={styles.actions}>
                        <button
                          data-admin-mutation
                          type="button"
                          className={`${styles.btn} ${styles.btnPrimary}`}
                          disabled={saving}
                          onClick={() => void saveEdit(r.id)}
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          className={styles.btn}
                          disabled={saving}
                          onClick={cancelEdit}
                        >
                          Отмена
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{r.name}</td>
                      <td className={styles.mono}>{r.slug}</td>
                      <td>{r.country || '—'}</td>
                      <td>{r.isActive ? 'Да' : 'Нет'}</td>
                      <td className={styles.num}>{r._count?.products ?? 0}</td>
                      <td className={styles.actions}>
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.btn}
                          disabled={saving}
                          onClick={() => startEdit(r)}
                        >
                          Изменить
                        </button>
                        <button
                          data-admin-mutation
                          type="button"
                          className={`${styles.btn} ${styles.btnDanger}`}
                          disabled={saving}
                          onClick={() => void handleDelete(r)}
                        >
                          Удалить
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
