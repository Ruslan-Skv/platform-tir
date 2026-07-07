'use client';

import Link from 'next/link';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
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
      <div className={cdProduct.doorsSpecificationImportRow}>
        <button
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${cdProduct.doorsSpecificationImportBtn}`}
          disabled={disabled || importBusy}
          onClick={() => void importFromCart(lines, onLinesChange)}
        >
          {loading ? 'Загрузка…' : 'Загрузить из корзины'}
        </button>
        <p className={cdProduct.doorsSpecificationImportHint}>
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
