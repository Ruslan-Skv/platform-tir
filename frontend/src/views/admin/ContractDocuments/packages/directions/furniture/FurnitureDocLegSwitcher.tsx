'use client';

import cdDataTab from '../../../styles/data-tab.module.css';
import styles from './FurnitureDocLegSwitcher.module.css';
import type { FurnitureActiveDocLeg } from './furnitureLegs';

type Props = {
  montageEnabled: boolean;

  appliancesEnabled: boolean;

  activeDocLeg: FurnitureActiveDocLeg;

  locked?: boolean;

  onChange: (leg: FurnitureActiveDocLeg) => void;
};

/** Переключатель комплекта документов: изготовление / монтаж / техника. */

export function FurnitureDocLegSwitcher({
  montageEnabled,

  appliancesEnabled,

  activeDocLeg,

  locked = false,

  onChange,
}: Props) {
  if (!montageEnabled && !appliancesEnabled) return null;

  return (
    <div
      className={`${cdDataTab.blockData} ${styles.wrap}`}
      role="tablist"
      aria-label="Комплект документов"
    >
      <button
        type="button"
        role="tab"
        aria-selected={activeDocLeg === 'manufacture'}
        className={activeDocLeg === 'manufacture' ? styles.active : styles.btn}
        disabled={locked}
        onClick={() => onChange('manufacture')}
      >
        Изготовление (м)
      </button>

      {montageEnabled ? (
        <button
          type="button"
          role="tab"
          aria-selected={activeDocLeg === 'montage'}
          className={activeDocLeg === 'montage' ? styles.active : styles.btn}
          disabled={locked}
          onClick={() => onChange('montage')}
        >
          Монтаж (с)
        </button>
      ) : null}

      {appliancesEnabled ? (
        <button
          type="button"
          role="tab"
          aria-selected={activeDocLeg === 'appliances'}
          className={activeDocLeg === 'appliances' ? styles.active : styles.btn}
          disabled={locked}
          onClick={() => onChange('appliances')}
        >
          Техника (т)
        </button>
      ) : null}
    </div>
  );
}
