'use client';

import Link from 'next/link';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import {
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_HINT,
} from '../../../platform/ui/packageTabClassNames';
import { DoorsSpecificationCartImportModals } from './DoorsSpecificationCartImportModals';
import type { DoorsSpecificationLine } from './doorsSpecification';
import { useDoorsSpecificationCartImport } from './useDoorsSpecificationCartImport';

type Props = {
  lines: DoorsSpecificationLine[];
  disabled?: boolean;
  onLinesChange: (lines: DoorsSpecificationLine[]) => void;
};

export function DoorsSpecificationCartImportButton({
  lines,
  disabled = false,
  onLinesChange,
}: Props) {
  const {
    loading,
    infoModal,
    modeModal,
    importFromCart,
    applyImportMode,
    closeInfoModal,
    closeModeModal,
  } = useDoorsSpecificationCartImport();

  const importBusy = loading || modeModal != null;

  return (
    <>
      <div className={PACKAGE_TAB_FIELD}>
        <button
          type="button"
          className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
          disabled={disabled || importBusy}
          onClick={() => void importFromCart(lines, onLinesChange)}
        >
          {loading ? 'Загрузка…' : 'Загрузить из корзины'}
        </button>
        <p className={PACKAGE_TAB_FIELD_HINT}>
          Сначала добавьте товары в{' '}
          <Link
            className={cdHub.link}
            href="/catalog/products"
            target="_blank"
            rel="noopener noreferrer"
          >
            каталоге
          </Link>
          , затем загрузите нужные позиции сюда.
        </p>
      </div>

      <DoorsSpecificationCartImportModals
        infoModal={infoModal}
        modeModal={modeModal}
        onCloseInfo={closeInfoModal}
        onCloseMode={closeModeModal}
        onChooseReplace={() => applyImportMode('replace')}
        onChooseAppend={() => applyImportMode('append')}
      />
    </>
  );
}
