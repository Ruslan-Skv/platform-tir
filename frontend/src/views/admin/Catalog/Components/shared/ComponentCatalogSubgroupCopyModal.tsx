'use client';

import React, { useEffect, useState } from 'react';

import {
  type AdminComponentCatalogGroup,
  copyAdminComponentCatalogSubgroup,
  slugifyComponentCatalog,
} from '@/shared/api/admin-component-catalog';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';

import styles from '../list/ComponentCatalogPage.module.css';
import modalStyles from './ComponentCatalogModal.module.css';

type ComponentCatalogSubgroupCopyModalProps = {
  open: boolean;
  sourceGroup: AdminComponentCatalogGroup | null;
  onClose: () => void;
  onCopied: () => void;
  onError: (msg: string) => void;
};

export function ComponentCatalogSubgroupCopyModal({
  open,
  sourceGroup,
  onClose,
  onCopied,
  onError,
}: ComponentCatalogSubgroupCopyModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [variantNote, setVariantNote] = useState('');
  const [slug, setSlug] = useState('');
  const [autoSlug, setAutoSlug] = useState(true);
  const [priceDelta, setPriceDelta] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !sourceGroup) return;
    setName('');
    setColor('');
    setVariantNote(sourceGroup.series ?? '');
    setSlug('');
    setAutoSlug(true);
    setPriceDelta('');
  }, [open, sourceGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceGroup) return;
    const n = name.trim();
    const c = color.trim();
    if (!n || !c) {
      onError('Укажите название и цвет новой подгруппы');
      return;
    }
    const s = (slug.trim() || slugifyComponentCatalog(n)).trim();
    const delta = priceDelta.trim() ? parseFloat(priceDelta.replace(',', '.')) : undefined;
    if (priceDelta.trim() && Number.isNaN(delta)) {
      onError('Некорректная корректировка цены');
      return;
    }

    setSaving(true);
    try {
      await copyAdminComponentCatalogSubgroup(sourceGroup.id, {
        name: n,
        color: c,
        variantNote: variantNote.trim() || undefined,
        slug: s,
        priceDelta: delta,
      });
      onCopied();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Ошибка копирования');
    } finally {
      setSaving(false);
    }
  };

  if (!sourceGroup) return null;

  const sampleColor =
    sourceGroup.items[0]?.catalogItem.color ??
    sourceGroup.items.find((i) => i.catalogItem.color)?.catalogItem.color;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Копировать подгруппу"
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
          Будет создана новая подгруппа в группе моделей «{sourceGroup.seriesRef?.name ?? '—'}» с
          копиями всех {sourceGroup.items.length} позиций. Укажите новый цвет — он подставится во
          все позиции; при необходимости скорректируйте цену единым сдвигом, затем отредактируйте
          отдельные позиции вручную.
        </p>

        <div data-modal-form-grid className={styles.groupFormGrid}>
          <div data-modal-form-group className={styles.groupNameField}>
            <label htmlFor="copy-subgroup-name">Название подгруппы *</label>
            <input
              id="copy-subgroup-name"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (autoSlug) setSlug(slugifyComponentCatalog(v));
              }}
              placeholder="ЛОФТ Серый (телескопический)"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="copy-subgroup-color">Новый цвет для всех позиций *</label>
            <input
              id="copy-subgroup-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder={sampleColor ? `было: ${sampleColor}` : 'Серый, Бетон…'}
            />
          </div>

          <div data-modal-form-group className={styles.groupSeriesField}>
            <label htmlFor="copy-subgroup-note">Примечание к варианту</label>
            <input
              id="copy-subgroup-note"
              value={variantNote}
              onChange={(e) => setVariantNote(e.target.value)}
              placeholder="Телескопический погонаж"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="copy-subgroup-price-delta">Корректировка цены, ₽</label>
            <input
              id="copy-subgroup-price-delta"
              value={priceDelta}
              onChange={(e) => setPriceDelta(e.target.value)}
              placeholder="0 — оставить как в источнике"
            />
          </div>

          <div data-modal-form-group>
            <label htmlFor="copy-subgroup-slug">Slug</label>
            <input
              id="copy-subgroup-slug"
              value={slug}
              onChange={(e) => {
                setAutoSlug(false);
                setSlug(e.target.value);
              }}
            />
          </div>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="submit" data-modal-btn="primary" disabled={saving}>
            {saving ? 'Копирование…' : 'Создать подгруппу'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
