'use client';

import { useCallback, useState } from 'react';

import {
  buildContractLegalListHtml,
  changeContractLegalListLevel,
} from '@/views/admin/ContractDocuments/core/typography/contractLegalList';
import {
  type BulletMarkerId,
  applyBulletedListInVisualEditor,
  applyContractMultilevelListInVisualEditor,
  applyNumberedListInVisualEditor,
  buildBulletedListHtml,
  buildNumberedListHtml,
  detectSectionForListHtml,
  getLinesForListFromHtmlSelection,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateLists';
import { insertContractRemarkBlankLinesInVisualEditor } from '@/views/admin/ContractDocuments/core/typography/contractTemplateRemarkBlankLines';

import { normalizeTemplateEditorHtml } from '../../templatesLibraryHtmlNormalize';
import type { TemplateEditorFormatDeps } from './templateEditorFormatDeps';

export type TemplateEditorFormatLists = ReturnType<typeof useTemplateEditorFormatLists>;

export function useTemplateEditorFormatLists(deps: TemplateEditorFormatDeps) {
  const {
    applyTemplateHistorySnapshot,
    editorMode,
    isSuperAdmin,
    restoreVisualSelection,
    setError,
    setOk,
    syncVisualEditorFromDom,
    updateHtmlBySelection,
    visualDraftHtml,
    visualEditorRef,
  } = deps;

  const readVisualEditorHtml = useCallback(
    (): string => visualEditorRef.current?.innerHTML ?? visualDraftHtml,
    [visualDraftHtml, visualEditorRef]
  );

  const [bulletMarker, setBulletMarker] = useState<BulletMarkerId>('disc');

  const applyBulletedList = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      if (!applyBulletedListInVisualEditor(el, bulletMarker)) {
        setError(
          'Маркированный список нельзя применить внутри договорной нумерации. Выйдите: Enter в пустом пункте.'
        );
        return;
      }
      setError(null);
      syncVisualEditorFromDom();
      return;
    }
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = getLinesForListFromHtmlSelection(selected, hasSelection, ['Пункт списка']);
      return { content: buildBulletedListHtml(lines, bulletMarker) };
    });
  };

  const applyNumberedList = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      if (!applyNumberedListInVisualEditor(el)) {
        setError(
          'Обычную нумерацию 1. 2. 3. нельзя смешивать с договорным списком (1. / 1.1.). Выйдите из договорного списка.'
        );
        return;
      }
      setError(null);
      syncVisualEditorFromDom();
      return;
    }
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = getLinesForListFromHtmlSelection(selected, hasSelection, [
        'Пункт 1',
        'Пункт 2',
      ]);
      return { content: buildNumberedListHtml(lines) };
    });
  };

  const applyMultilevelContractList = () => {
    if (editorMode === 'visual') {
      const el = visualEditorRef.current;
      if (!el) return;
      el.focus();
      restoreVisualSelection();
      applyContractMultilevelListInVisualEditor(el);
      setError(null);
      syncVisualEditorFromDom();
      return;
    }
    updateHtmlBySelection((selected, hasSelection) => {
      const lines = getLinesForListFromHtmlSelection(selected, hasSelection, ['']);
      const section = detectSectionForListHtml(visualEditorRef.current);
      return { content: buildContractLegalListHtml(lines, section) };
    });
    setError(null);
  };

  const insertRemarkBlankLines = () => {
    if (editorMode !== 'visual') {
      setError(
        'Вставка пустых строк для замечаний — в визуальном конструкторе: курсор в пункт списка (1., 1.1., 2.3. …).'
      );
      return;
    }
    const el = visualEditorRef.current;
    if (!el) return;
    el.focus();
    restoreVisualSelection();
    if (insertContractRemarkBlankLinesInVisualEditor(el)) {
      syncVisualEditorFromDom();
      setError(null);
      setOk('Добавлены 2 строки с линией для замечаний. Enter — следующий пункт списка.');
    } else {
      setError(
        'Поставьте курсор в пункт договорного списка (1., 1.1., 2.3. …), после которого нужны пустые строки, и нажмите снова.'
      );
    }
  };

  const packageContractLegalListsInEditor = useCallback(() => {
    if (!isSuperAdmin || editorMode !== 'visual') return;
    const next = normalizeTemplateEditorHtml(readVisualEditorHtml());
    applyTemplateHistorySnapshot(next);
    setOk('Списки исправлены: убрана лишняя обёртка, пустые пункты (1.3) и служебные комментарии.');
    setError(null);
  }, [
    applyTemplateHistorySnapshot,
    editorMode,
    isSuperAdmin,
    readVisualEditorHtml,
    setError,
    setOk,
  ]);

  const changeListLevel = (direction: 'indent' | 'outdent') => {
    if (editorMode !== 'visual' || !visualEditorRef.current) return;
    visualEditorRef.current.focus();
    restoreVisualSelection();
    if (changeContractLegalListLevel(visualEditorRef.current, direction)) {
      syncVisualEditorFromDom();
      setError(null);
    } else {
      setError(
        '⇤: поднять подпункт на уровень выше. Раздел 2 — Shift+Enter, не Tab (Tab вложит 2 внутрь 1).'
      );
    }
  };

  return {
    applyBulletedList,
    applyMultilevelContractList,
    applyNumberedList,
    bulletMarker,
    setBulletMarker,
    changeListLevel,
    insertRemarkBlankLines,
    packageContractLegalListsInEditor,
  };
}
