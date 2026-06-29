'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import {
  getAdminHomeSectionsVisibility,
  updateAdminHomeSectionsVisibility,
} from '@/shared/api/home-sections';
import {
  HOME_SECTION_VISIBILITY_PAIRS,
  type HomeSectionDesktopKey,
  type HomeSectionMobileKey,
  normalizeHomeSectionsVisibility,
} from '@/shared/lib/home-sections-visibility';

import styles from './SectionVisibilityCheckbox.module.css';

interface SectionVisibilityCheckboxProps {
  sectionKey: HomeSectionDesktopKey;
  sectionLabel: string;
}

function getMobileKey(desktopKey: HomeSectionDesktopKey): HomeSectionMobileKey {
  const pair = HOME_SECTION_VISIBILITY_PAIRS.find((item) => item.desktopKey === desktopKey);
  if (!pair) {
    throw new Error(`Unknown section key: ${desktopKey}`);
  }
  return pair.mobileKey;
}

export function SectionVisibilityCheckbox({
  sectionKey,
  sectionLabel,
}: SectionVisibilityCheckboxProps) {
  const { canEdit } = useAdminSectionCanEdit();
  const mobileKey = getMobileKey(sectionKey);
  const [visibility, setVisibility] = useState<Pick<
    HomeSectionsVisibility,
    HomeSectionDesktopKey | HomeSectionMobileKey
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadVisibility = useCallback(async () => {
    try {
      const data = normalizeHomeSectionsVisibility(await getAdminHomeSectionsVisibility());
      setVisibility({
        [sectionKey]: data[sectionKey],
        [mobileKey]: data[mobileKey],
      } as Pick<HomeSectionsVisibility, HomeSectionDesktopKey | HomeSectionMobileKey>);
    } catch {
      setVisibility({
        [sectionKey]: true,
        [mobileKey]: true,
      } as Pick<HomeSectionsVisibility, HomeSectionDesktopKey | HomeSectionMobileKey>);
    } finally {
      setLoading(false);
    }
  }, [mobileKey, sectionKey]);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const handleToggle = async (
    key: HomeSectionDesktopKey | HomeSectionMobileKey,
    checked: boolean
  ) => {
    if (!canEdit || !visibility) return;
    const previous = visibility;
    const next = { ...visibility, [key]: checked };
    setVisibility(next);
    setSaving(true);
    try {
      await updateAdminHomeSectionsVisibility({ [key]: checked });
    } catch {
      setVisibility(previous);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !canEdit || !visibility) return null;

  return (
    <div className={styles.wrapper}>
      <p className={styles.title}>Показывать блок «{sectionLabel}» на главной странице</p>
      <div className={styles.toggles}>
        <label className={styles.label}>
          <input
            type="checkbox"
            checked={visibility[sectionKey]}
            onChange={(e) => handleToggle(sectionKey, e.target.checked)}
            disabled={saving}
            className={styles.checkbox}
          />
          <span>Десктоп</span>
        </label>
        <label className={styles.label}>
          <input
            type="checkbox"
            checked={visibility[mobileKey]}
            onChange={(e) => handleToggle(mobileKey, e.target.checked)}
            disabled={saving}
            className={styles.checkbox}
          />
          <span>Мобильные</span>
        </label>
      </div>
    </div>
  );
}
