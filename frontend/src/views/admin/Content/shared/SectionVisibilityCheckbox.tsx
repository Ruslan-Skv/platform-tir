'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import {
  getAdminHomeSectionsVisibility,
  updateAdminHomeSectionsVisibility,
} from '@/shared/api/home-sections';

import styles from './SectionVisibilityCheckbox.module.css';

type SectionKey = keyof HomeSectionsVisibility;

interface SectionVisibilityCheckboxProps {
  sectionKey: SectionKey;
  sectionLabel: string;
}

export function SectionVisibilityCheckbox({
  sectionKey,
  sectionLabel,
}: SectionVisibilityCheckboxProps) {
  const { canEdit } = useAdminSectionCanEdit();
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadVisibility = useCallback(async () => {
    try {
      const data = await getAdminHomeSectionsVisibility();
      setVisible(data[sectionKey]);
    } catch {
      setVisible(true);
    } finally {
      setLoading(false);
    }
  }, [sectionKey]);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const handleToggle = async (checked: boolean) => {
    if (!canEdit) return;
    setVisible(checked);
    setSaving(true);
    try {
      await updateAdminHomeSectionsVisibility({ [sectionKey]: checked });
    } catch {
      setVisible(!checked);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !canEdit) return null;

  return (
    <div className={styles.wrapper}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={saving}
          className={styles.checkbox}
        />
        <span>Показывать блок «{sectionLabel}» на главной странице</span>
      </label>
    </div>
  );
}
