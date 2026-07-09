'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  type AdminComponentCatalogItem,
  type AdminComponentCatalogKind,
  addAdminComponentCatalogGroupItem,
  buildComponentCatalogSlug,
  createAdminComponentCatalogItem,
  updateAdminComponentCatalogItem,
} from '@/shared/api/admin-component-catalog';
import { Modal } from '@/shared/ui/Modal';
import { AdminSaveNotice } from '@/shared/ui/admin/AdminSaveNotice';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import modalStyles from './ComponentCatalogModal.module.css';

type ComponentCatalogItemModalProps = {
  open: boolean;
  item: AdminComponentCatalogItem | null;
  copyFrom: AdminComponentCatalogItem | null;
  assignToGroup: { id: string; name: string } | null;
  kindOptions: AdminComponentCatalogKind[];
  onClose: () => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

type CatalogItemFormState = {
  kindId: string;
  name: string;
  size: string;
  color: string;
  material: string;
  price: string;
  slug: string;
  isActive: boolean;
  sortOrder: string;
};

type FormSnapshot = {
  form: CatalogItemFormState;
  autoSlug: boolean;
};

const SAVE_SUCCESS_VISIBLE_MS = 3000;

const emptyForm = (defaultKindId = ''): CatalogItemFormState => ({
  kindId: defaultKindId,
  name: '',
  size: '',
  color: '',
  material: '',
  price: '',
  slug: '',
  isActive: true,
  sortOrder: '0',
});

function formFromItem(item: AdminComponentCatalogItem): CatalogItemFormState {
  return {
    kindId: item.kindId,
    name: item.name,
    size: item.size ?? '',
    color: item.color ?? '',
    material: item.material ?? '',
    price: item.price,
    slug: item.slug,
    isActive: item.isActive,
    sortOrder: String(item.sortOrder ?? 0),
  };
}

function formFromCopySource(item: AdminComponentCatalogItem): CatalogItemFormState {
  const base = formFromItem(item);
  let slug = buildComponentCatalogSlug(base);
  if (!slug || slug === item.slug) {
    slug = slug ? `${slug}-copy` : 'copy';
  }
  return { ...base, slug };
}

function withAutoSlug(
  form: CatalogItemFormState,
  patch: Partial<CatalogItemFormState>,
  autoSlug: boolean
): CatalogItemFormState {
  const next = { ...form, ...patch };
  if (autoSlug) {
    next.slug = buildComponentCatalogSlug(next);
  }
  return next;
}

function effectiveSlug(form: CatalogItemFormState, autoSlug: boolean): string {
  if (autoSlug) {
    return buildComponentCatalogSlug(form);
  }
  return form.slug.trim();
}

function snapshotsEqual(a: FormSnapshot, b: FormSnapshot): boolean {
  const af = a.form;
  const bf = b.form;
  return (
    af.kindId === bf.kindId &&
    af.name === bf.name &&
    af.size === bf.size &&
    af.color === bf.color &&
    af.material === bf.material &&
    af.price === bf.price &&
    effectiveSlug(af, a.autoSlug) === effectiveSlug(bf, b.autoSlug) &&
    af.isActive === bf.isActive &&
    af.sortOrder === bf.sortOrder
  );
}

export function ComponentCatalogItemModal({
  open,
  item,
  copyFrom,
  assignToGroup,
  kindOptions,
  onClose,
  onSaved,
  onError,
}: ComponentCatalogItemModalProps) {
  const [form, setForm] = useState<CatalogItemFormState>(() => emptyForm());
  const [autoSlug, setAutoSlug] = useState(true);
  const [savedSnapshot, setSavedSnapshot] = useState<FormSnapshot>({
    form: emptyForm(),
    autoSlug: true,
  });
  const [persistedItem, setPersistedItem] = useState<AdminComponentCatalogItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const [isCopyMode, setIsCopyMode] = useState(false);
  const saveSuccessTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const clearSaveSuccess = useCallback(() => {
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current);
      saveSuccessTimeoutRef.current = null;
    }
    setSaveSuccessVisible(false);
  }, []);

  const showSaveSuccess = useCallback(() => {
    if (saveSuccessTimeoutRef.current) {
      clearTimeout(saveSuccessTimeoutRef.current);
    }
    setSaveSuccessVisible(true);
    saveSuccessTimeoutRef.current = setTimeout(() => {
      setSaveSuccessVisible(false);
      saveSuccessTimeoutRef.current = null;
    }, SAVE_SUCCESS_VISIBLE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveSuccessTimeoutRef.current) {
        clearTimeout(saveSuccessTimeoutRef.current);
      }
    };
  }, []);

  const defaultKindId = kindOptions.find((k) => k.code === 'OTHER')?.id ?? kindOptions[0]?.id ?? '';

  useEffect(() => {
    if (!open) return;
    clearSaveSuccess();
    setError(null);
    setPersistedItem(null);
    if (item) {
      const nextForm = formFromItem(item);
      setForm(nextForm);
      setSavedSnapshot({ form: nextForm, autoSlug: false });
      setAutoSlug(false);
      setIsCopyMode(false);
    } else if (copyFrom) {
      const nextForm = formFromCopySource(copyFrom);
      setForm(nextForm);
      setSavedSnapshot({ form: emptyForm(defaultKindId), autoSlug: true });
      setAutoSlug(true);
      setIsCopyMode(true);
      window.setTimeout(() => colorInputRef.current?.focus(), 0);
    } else {
      const initial = emptyForm(defaultKindId);
      setForm(initial);
      setSavedSnapshot({ form: initial, autoSlug: true });
      setAutoSlug(true);
      setIsCopyMode(false);
    }
  }, [open, item, copyFrom, clearSaveSuccess, defaultKindId]);

  const currentSnapshot: FormSnapshot = { form, autoSlug };
  const hasChanges = !snapshotsEqual(currentSnapshot, savedSnapshot);

  useEffect(() => {
    if (hasChanges && saveSuccessVisible) {
      clearSaveSuccess();
    }
  }, [clearSaveSuccess, hasChanges, saveSuccessVisible]);

  const handleClose = () => {
    if (saving) return;
    clearSaveSuccess();
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !hasChanges) return;

    const name = form.name.trim();
    const price = parseFloat(form.price.replace(',', '.'));
    if (!name || !Number.isFinite(price) || price < 0) {
      const msg = 'Заполните название и корректную цену';
      setError(msg);
      onError(msg);
      return;
    }
    const slug = effectiveSlug(form, autoSlug).trim();
    if (!slug) {
      const msg = 'Укажите slug';
      setError(msg);
      onError(msg);
      return;
    }

    const activeItem = persistedItem ?? item;
    const isNewItem = !activeItem;
    if (activeItem) {
      const usage = activeItem._count?.productComponents ?? 0;
      if (usage > 0 && !confirm(`Цена изменится у ${usage} товаров. Продолжить?`)) return;
    }

    setSaving(true);
    setError(null);
    clearSaveSuccess();
    try {
      const body = {
        kindId: form.kindId,
        name,
        size: form.size.trim() || undefined,
        color: form.color.trim() || undefined,
        material: form.material.trim() || undefined,
        price,
        slug,
        isActive: form.isActive,
        sortOrder: parseInt(form.sortOrder, 10) || 0,
      };
      const saved = activeItem
        ? await updateAdminComponentCatalogItem(activeItem.id, body)
        : await createAdminComponentCatalogItem(body);

      if (isNewItem && assignToGroup) {
        await addAdminComponentCatalogGroupItem(assignToGroup.id, saved.id);
      }

      const nextForm = formFromItem(saved);
      setForm(nextForm);
      setSavedSnapshot({ form: nextForm, autoSlug: false });
      setAutoSlug(false);
      setPersistedItem(saved);
      setIsCopyMode(false);
      showSaveSuccess();
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(msg);
      onError(msg);
    } finally {
      setSaving(false);
    }
  };

  const isEdit = Boolean(persistedItem ?? item);
  const title = isCopyMode
    ? assignToGroup
      ? `Новая позиция (копия) · ${assignToGroup.name}`
      : 'Новая позиция (копия)'
    : isEdit
      ? 'Редактировать позицию справочника'
      : assignToGroup
        ? `Новая позиция · ${assignToGroup.name}`
        : 'Новая позиция справочника';

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title={title}
      titleAside={<AdminSaveNotice visible={saveSuccessVisible} />}
      size="lg"
      className={crmFormStyles.modalPanel}
      showCloseButton
    >
      <form
        className={`${crmFormStyles.formShell} ${modalStyles.formBlueShell}`}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          {assignToGroup ? (
            <>
              После сохранения позиция будет автоматически добавлена в подгруппу «
              {assignToGroup.name}». Если в справочнике уже есть позиция с такими же параметрами,
              она будет использована повторно.
              {isCopyMode
                ? ' Скопированы данные исходной карточки — измените отличия (цвет, цену и т.д.).'
                : ' Заполните поля новой позиции.'}
            </>
          ) : isCopyMode ? (
            <>
              Скопированы данные выбранной позиции. Измените цвет, цену или другие отличия — slug
              обновится автоматически. Одинаковое название с другим цветом допустимо.
            </>
          ) : (
            <>
              Позиция используется в группах комплектующих и привязывается к карточкам дверей.
              Изменение цены здесь автоматически отразится во всех товарах, где позиция уже
              привязана. «В комплекте» и шаг количества задаются на вкладке «Параметры видов».
            </>
          )}
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="catalog-item-kind">Вид *</label>
            <select
              id="catalog-item-kind"
              value={form.kindId}
              disabled={saving}
              onChange={(e) => setForm({ ...form, kindId: e.target.value })}
            >
              {kindOptions.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-name">Название *</label>
            <input
              id="catalog-item-name"
              value={form.name}
              disabled={saving}
              onChange={(e) => {
                setForm(withAutoSlug(form, { name: e.target.value }, autoSlug));
              }}
              placeholder="Стойка коробки"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-size">Размер</label>
            <input
              id="catalog-item-size"
              value={form.size}
              disabled={saving}
              onChange={(e) => {
                setForm(withAutoSlug(form, { size: e.target.value }, autoSlug));
              }}
              placeholder="74 x 2100"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-color">Цвет</label>
            <input
              id="catalog-item-color"
              ref={colorInputRef}
              value={form.color}
              disabled={saving}
              onChange={(e) => {
                setForm(withAutoSlug(form, { color: e.target.value }, autoSlug));
              }}
              placeholder="Белый"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-material">Материал</label>
            <input
              id="catalog-item-material"
              value={form.material}
              disabled={saving}
              onChange={(e) => {
                setForm(withAutoSlug(form, { material: e.target.value }, autoSlug));
              }}
              placeholder="МДФ / экошпон"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-price">Цена, ₽ *</label>
            <input
              id="catalog-item-price"
              value={form.price}
              disabled={saving}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              inputMode="decimal"
              placeholder="770"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-slug">Slug *</label>
            <input
              id="catalog-item-slug"
              value={form.slug}
              disabled={saving}
              onChange={(e) => {
                setAutoSlug(false);
                setForm({ ...form, slug: e.target.value });
              }}
            />
            {autoSlug ? (
              <span style={{ fontSize: '0.6875rem', color: 'var(--admin-text-muted, #6b7280)' }}>
                Формируется из названия, размера, цвета и материала
              </span>
            ) : null}
          </div>

          <div data-modal-form-group>
            <label htmlFor="catalog-item-sort">Сортировка</label>
            <input
              id="catalog-item-sort"
              value={form.sortOrder}
              disabled={saving}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            />
          </div>

          <div data-modal-form-group>
            <label
              htmlFor="catalog-item-active"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <input
                id="catalog-item-active"
                type="checkbox"
                checked={form.isActive}
                disabled={saving}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Активна в справочнике
            </label>
          </div>
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={saving}>
            {hasChanges ? 'Отмена' : 'Закрыть'}
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={saving || !hasChanges}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
