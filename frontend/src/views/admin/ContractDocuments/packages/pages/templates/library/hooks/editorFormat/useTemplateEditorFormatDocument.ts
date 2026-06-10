'use client';

import {
  changeContractLegalListLevel,
  handleContractLegalListBackspace,
  handleContractLegalListEnter,
  handleContractLegalListShiftEnter,
  isNodeInsideContractLegalList,
} from '@/views/admin/ContractDocuments/core/typography/contractLegalList';

import { pickTemplateEditorFormatDeps } from './templateEditorFormatDeps';
import type { UseTemplatesLibraryEditorFormatParams } from './templateEditorFormatTypes';
import { useTemplateEditorFormatBlocks } from './useTemplateEditorFormatBlocks';
import type { TemplateEditorFormatHistory } from './useTemplateEditorFormatHistory';
import { useTemplateEditorFormatHistory } from './useTemplateEditorFormatHistory';
import type { TemplateEditorFormatSelection } from './useTemplateEditorFormatSelection';

export type TemplateEditorFormatDocument = ReturnType<typeof useTemplateEditorFormatDocument>;

function useTemplateEditorFormatKeyDown(
  deps: ReturnType<typeof pickTemplateEditorFormatDeps>,
  history: Pick<TemplateEditorFormatHistory, 'handleTemplateRedo' | 'handleTemplateUndo'>
) {
  const {
    editorMode,
    isSuperAdmin,
    syncVisualEditorFromDom,
    templateHistoryIndexRef,
    templateHistoryRef,
    visualEditorRef,
  } = deps;
  const { handleTemplateRedo, handleTemplateUndo } = history;

  const handleVisualEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (editorMode !== 'visual' || !isSuperAdmin) return;
    const el = visualEditorRef.current;
    if (!el) return;

    if (e.key === 'Tab') {
      const sel = window.getSelection();
      const node = sel?.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
      if (isNodeInsideContractLegalList(el, node)) {
        e.preventDefault();
        changeContractLegalListLevel(el, e.shiftKey ? 'outdent' : 'indent');
        syncVisualEditorFromDom();
      }
      return;
    }

    if (e.key === 'Enter' && e.shiftKey) {
      if (handleContractLegalListShiftEnter(el)) {
        e.preventDefault();
        syncVisualEditorFromDom();
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      if (handleContractLegalListEnter(el)) {
        e.preventDefault();
        syncVisualEditorFromDom();
        return;
      }
    }

    if (e.key === 'Backspace') {
      if (handleContractLegalListBackspace(el)) {
        e.preventDefault();
        syncVisualEditorFromDom();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === 'z' && !e.shiftKey) {
        if (templateHistoryIndexRef.current <= 0) return;
        e.preventDefault();
        handleTemplateUndo();
        return;
      }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        if (templateHistoryIndexRef.current >= templateHistoryRef.current.length - 1) return;
        e.preventDefault();
        handleTemplateRedo();
      }
    }
  };

  return { handleVisualEditorKeyDown };
}

export function useTemplateEditorFormatDocument(
  params: UseTemplatesLibraryEditorFormatParams,
  selection: TemplateEditorFormatSelection
) {
  const deps = pickTemplateEditorFormatDeps(params, selection);
  const history = useTemplateEditorFormatHistory(deps);
  const blocks = useTemplateEditorFormatBlocks(deps);
  const { handleVisualEditorKeyDown } = useTemplateEditorFormatKeyDown(deps, history);

  return {
    ...blocks,
    ...history,
    handleVisualEditorKeyDown,
  };
}
