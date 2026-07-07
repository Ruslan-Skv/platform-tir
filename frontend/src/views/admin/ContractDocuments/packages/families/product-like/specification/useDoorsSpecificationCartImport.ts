'use client';

import { useCallback, useState } from 'react';

import { getCart } from '@/shared/api/cart';

import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
} from './doorsSpecification';
import {
  type DoorsSpecificationCartImportMode,
  mapCartItemsToDoorsSpecificationLines,
  mergeDoorsSpecificationLines,
} from './mapCartItemsToDoorsSpecificationLines';

export type DoorsSpecificationCartImportResult = {
  importedCount: number;
  skippedCount: number;
  mode: DoorsSpecificationCartImportMode;
};

export type DoorsSpecificationCartImportInfoModal = {
  title: string;
  message: string;
};

export type DoorsSpecificationCartImportModeModal = {
  existingLines: DoorsSpecificationLine[];
  imported: DoorsSpecificationLine[];
  skippedCount: number;
  onLinesChange: (lines: DoorsSpecificationLine[]) => void;
};

export function useDoorsSpecificationCartImport() {
  const [loading, setLoading] = useState(false);
  const [infoModal, setInfoModal] = useState<DoorsSpecificationCartImportInfoModal | null>(null);
  const [modeModal, setModeModal] = useState<DoorsSpecificationCartImportModeModal | null>(null);

  const closeInfoModal = useCallback(() => setInfoModal(null), []);
  const closeModeModal = useCallback(() => setModeModal(null), []);

  const finishImport = useCallback(
    (
      existingLines: DoorsSpecificationLine[],
      imported: DoorsSpecificationLine[],
      mode: DoorsSpecificationCartImportMode,
      onLinesChange: (lines: DoorsSpecificationLine[]) => void,
      skippedCount: number
    ): DoorsSpecificationCartImportResult => {
      const merged = mergeDoorsSpecificationLines(existingLines, imported, mode);
      onLinesChange(merged);

      if (skippedCount > 0) {
        setInfoModal({
          title: 'Импорт из корзины',
          message: `Загружено позиций: ${imported.length}. Пропущено: ${skippedCount}.`,
        });
      }

      return { importedCount: imported.length, skippedCount, mode };
    },
    []
  );

  const applyImportMode = useCallback(
    (mode: DoorsSpecificationCartImportMode) => {
      if (!modeModal) return null;
      const result = finishImport(
        modeModal.existingLines,
        modeModal.imported,
        mode,
        modeModal.onLinesChange,
        modeModal.skippedCount
      );
      setModeModal(null);
      return result;
    },
    [finishImport, modeModal]
  );

  const importFromCart = useCallback(
    async (
      existingLines: DoorsSpecificationLine[],
      onLinesChange: (lines: DoorsSpecificationLine[]) => void
    ): Promise<DoorsSpecificationCartImportResult | null> => {
      setLoading(true);
      try {
        const cartItems = await getCart();
        const {
          lines: imported,
          importedCount,
          skippedCount,
        } = mapCartItemsToDoorsSpecificationLines(cartItems);

        if (importedCount === 0) {
          setInfoModal({
            title: 'Корзина',
            message:
              cartItems.length > 0
                ? 'Не удалось загрузить позиции из корзины: нет данных о товарах.'
                : 'Корзина пуста. Сначала добавьте товары в каталоге.',
          });
          return null;
        }

        const hasContent = existingLines.some(doorsSpecificationLineHasContent);
        if (hasContent) {
          setModeModal({ existingLines, imported, skippedCount, onLinesChange });
          return null;
        }

        return finishImport(existingLines, imported, 'replace', onLinesChange, skippedCount);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить корзину';
        setInfoModal({ title: 'Ошибка', message });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [finishImport]
  );

  return {
    loading,
    infoModal,
    modeModal,
    importFromCart,
    applyImportMode,
    closeInfoModal,
    closeModeModal,
  };
}
