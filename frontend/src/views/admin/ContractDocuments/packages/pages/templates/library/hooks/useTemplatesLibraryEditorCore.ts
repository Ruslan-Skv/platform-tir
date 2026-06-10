import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type ContractDocumentPackageKind,
  type ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { resolveLibraryTemplateSelection } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateSelection';
import {
  PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS,
  type PackageLibraryTemplateTabId,
} from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';
import { appendTemplateHistoryEntry } from '@/views/admin/ContractDocuments/packages/platform/templateEditorHistory';
import {
  applyWordImportedDocPrintCompact,
  readWordHtmlExportFileAsString,
} from '@/views/admin/ContractDocuments/packages/platform/wordHtmlImport';

import {
  ensureDocPrintRootWrapper,
  normalizeTemplateEditorHtml,
} from '../templatesLibraryHtmlNormalize';
import {
  TEMPLATES_EDITOR_MODE_KEY,
  TEMPLATE_HTML_HISTORY_DEBOUNCE_MS,
} from '../templatesLibraryStorage';

export type UseTemplatesLibraryEditorCoreParams = {
  isSuperAdmin: boolean;
  activeLibraryKind: ContractDocumentPackageKind;
  activeTemplateTab: PackageLibraryTemplateTabId;
  showArchivedTemplates: boolean;
  loading: boolean;
  editingId: string;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  setTitleRenameMode: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setOk: React.Dispatch<React.SetStateAction<string | null>>;
  preferredTemplateIdsRef: React.MutableRefObject<Record<string, string>>;
  templatesScopeKey: (
    kind: ContractDocumentPackageKind,
    tab: PackageLibraryTemplateTabId,
    archived: boolean
  ) => string;
  uiPrefsLoadedRef: React.MutableRefObject<boolean>;
  itemsRef: React.RefObject<ContractTemplatePreset[]>;
  templateTabSwitchRef: React.MutableRefObject<boolean>;
  templateArchiveSwitchRef: React.MutableRefObject<boolean>;
};

export function useTemplatesLibraryEditorCore({
  isSuperAdmin,
  activeLibraryKind,
  activeTemplateTab,
  showArchivedTemplates,
  loading,
  editingId,
  setEditingId,
  setTitle,
  setTitleRenameMode,
  setError,
  setOk,
  preferredTemplateIdsRef,
  templatesScopeKey,
  uiPrefsLoadedRef,
  itemsRef,
  templateTabSwitchRef,
  templateArchiveSwitchRef,
}: UseTemplatesLibraryEditorCoreParams) {
  const [html, setHtml] = useState('');
  const [editorMode, setEditorMode] = useState<'html' | 'visual'>('html');
  const [visualDraftHtml, setVisualDraftHtml] = useState('');
  const [templateContentEpoch, setTemplateContentEpoch] = useState(0);
  const [templateHistory, setTemplateHistory] = useState<string[]>([]);
  const [templateHistoryIndex, setTemplateHistoryIndex] = useState(-1);
  const [tableEditActive, setTableEditActive] = useState(false);

  const htmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const visualEditorRef = useRef<HTMLDivElement>(null);
  const visualSelectionRangeRef = useRef<Range | null>(null);
  const templateHistoryRef = useRef<string[]>([]);
  const templateHistoryIndexRef = useRef(-1);
  const skipNextTemplateHistoryPushRef = useRef(false);
  const htmlHistoryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureTemplateDraftForEditing = useCallback(() => {
    if (editingId) return editingId;
    const nextId = `tpl_${Date.now()}`;
    const nextTitle = `Новый шаблон (${PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS[activeTemplateTab]})`;
    setEditingId(nextId);
    setTitle(nextTitle);
    return nextId;
  }, [editingId, activeTemplateTab, setEditingId, setTitle]);

  useEffect(() => {
    templateHistoryRef.current = templateHistory;
  }, [templateHistory]);

  useEffect(() => {
    templateHistoryIndexRef.current = templateHistoryIndex;
  }, [templateHistoryIndex]);

  useEffect(
    () => () => {
      if (htmlHistoryDebounceRef.current) {
        clearTimeout(htmlHistoryDebounceRef.current);
      }
    },
    []
  );

  const pushTemplateHistory = useCallback((nextHtml: string) => {
    if (skipNextTemplateHistoryPushRef.current) {
      skipNextTemplateHistoryPushRef.current = false;
      return;
    }
    const { history: next, index } = appendTemplateHistoryEntry(
      templateHistoryRef.current,
      templateHistoryIndexRef.current,
      nextHtml
    );
    templateHistoryRef.current = next;
    templateHistoryIndexRef.current = index;
    setTemplateHistory(next);
    setTemplateHistoryIndex(index);
  }, []);

  const schedulePushTemplateHistoryFromHtml = useCallback(
    (nextHtml: string) => {
      if (htmlHistoryDebounceRef.current) {
        clearTimeout(htmlHistoryDebounceRef.current);
      }
      htmlHistoryDebounceRef.current = setTimeout(() => {
        htmlHistoryDebounceRef.current = null;
        pushTemplateHistory(nextHtml);
      }, TEMPLATE_HTML_HISTORY_DEBOUNCE_MS);
    },
    [pushTemplateHistory]
  );

  const resetTemplateHistory = useCallback((htmlSnapshot: string) => {
    if (htmlHistoryDebounceRef.current) {
      clearTimeout(htmlHistoryDebounceRef.current);
      htmlHistoryDebounceRef.current = null;
    }
    templateHistoryRef.current = [htmlSnapshot];
    templateHistoryIndexRef.current = 0;
    setTemplateHistory([htmlSnapshot]);
    setTemplateHistoryIndex(0);
  }, []);

  const commitTemplateHtmlToState = useCallback(
    (raw: string) => {
      const normalized = normalizeTemplateEditorHtml(raw);
      setHtml(normalized);
      setVisualDraftHtml(normalized);
      resetTemplateHistory(normalized);
      setTemplateContentEpoch((epoch) => epoch + 1);
      return normalized;
    },
    [resetTemplateHistory]
  );

  const applyLibraryTemplateSelection = useCallback(
    (list: ContractTemplatePreset[], tab: PackageLibraryTemplateTabId) => {
      const preferredId =
        preferredTemplateIdsRef.current[
          templatesScopeKey(activeLibraryKind, tab, showArchivedTemplates)
        ];
      const sel = resolveLibraryTemplateSelection(list, activeLibraryKind, tab, {
        preferredId,
        archived: showArchivedTemplates,
      });
      setTitleRenameMode(false);
      setEditingId(sel.id);
      setTitle(
        sel.title ||
          (sel.isFallback ? `Новый шаблон (${PACKAGE_LIBRARY_TEMPLATE_TAB_LABELS[tab]})` : '')
      );
      commitTemplateHtmlToState(sel.html);
      return sel;
    },
    [
      activeLibraryKind,
      showArchivedTemplates,
      templatesScopeKey,
      commitTemplateHtmlToState,
      preferredTemplateIdsRef,
      setTitleRenameMode,
      setEditingId,
      setTitle,
    ]
  );

  const handleTemplateHtmlFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !isSuperAdmin) return;
    setError(null);
    setOk(null);
    try {
      const raw = await readWordHtmlExportFileAsString(file);
      const wrapped = ensureDocPrintRootWrapper(raw);
      const next = applyWordImportedDocPrintCompact(wrapped);
      setHtml(next);
      setEditorMode('html');
      setVisualDraftHtml(next);
      resetTemplateHistory(next);
      setOk(
        `Файл «${file.name}» загружен в поле HTML (кодировка windows-1251/UTF-8 определяется автоматически). Для фрагментов Word с классом WordSection1 добавлены более плотные отступы и печать с тем же классом docPrintWordCompact. Ползунок «Масштаб» у конструктора/предпросмотра меняет только отображение на экране, не печать. Для правок в конструкторе нажмите «HTML → конструктор».`
      );
    } catch {
      setError('Не удалось прочитать файл');
    }
  };

  const readVisualEditorHtml = (): string => visualEditorRef.current?.innerHTML ?? visualDraftHtml;

  const applyTemplateHistorySnapshot = useCallback((htmlSnapshot: string) => {
    skipNextTemplateHistoryPushRef.current = true;
    const normalized = normalizeTemplateEditorHtml(htmlSnapshot);
    setVisualDraftHtml(normalized);
    setHtml(normalized);
    const editor = visualEditorRef.current;
    if (!editor) return;
    const prevScrollTop = editor.scrollTop;
    const wasFocused = window.document.activeElement === editor;
    editor.innerHTML = normalized;
    window.requestAnimationFrame(() => {
      editor.scrollTop = prevScrollTop;
      if (wasFocused) {
        editor.focus({ preventScroll: true });
      }
    });
  }, []);

  const syncVisualEditorToHtmlState = useCallback(() => {
    const raw = readVisualEditorHtml();
    const next = normalizeTemplateEditorHtml(raw);
    const editor = visualEditorRef.current;
    if (editor && editor.innerHTML !== next) {
      editor.innerHTML = next;
    }
    setVisualDraftHtml(next);
    setHtml(next);
    return next;
  }, [visualDraftHtml]);

  const switchEditorMode = useCallback(
    (mode: 'html' | 'visual') => {
      if (mode === editorMode) return;
      if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
        try {
          window.localStorage.setItem(TEMPLATES_EDITOR_MODE_KEY, mode);
        } catch {
          // ignore localStorage write issues
        }
      }
      if (mode === 'html') {
        const next = visualEditorRef.current?.innerHTML ?? visualDraftHtml;
        setVisualDraftHtml(next);
        setHtml(next);
        pushTemplateHistory(next);
        setEditorMode('html');
        return;
      }
      const normalized = normalizeTemplateEditorHtml(html);
      setVisualDraftHtml(normalized);
      setHtml(normalized);
      pushTemplateHistory(normalized);
      setEditorMode('visual');
      if (visualEditorRef.current) {
        visualEditorRef.current.innerHTML = normalized || '';
      }
    },
    [editorMode, html, visualDraftHtml, pushTemplateHistory, uiPrefsLoadedRef]
  );

  useEffect(() => {
    const editor = visualEditorRef.current;
    if (!editor || editorMode !== 'visual') return;
    const raw = html || visualDraftHtml || '';
    const source = normalizeTemplateEditorHtml(raw);
    if (editor.innerHTML === source) return;
    const prevScrollTop = editor.scrollTop;
    const wasFocused = window.document.activeElement === editor;
    editor.innerHTML = source;
    window.requestAnimationFrame(() => {
      editor.scrollTop = prevScrollTop;
      if (wasFocused) {
        editor.focus({ preventScroll: true });
      }
    });
    if (source !== html || source !== visualDraftHtml) {
      setHtml(source);
      setVisualDraftHtml(source);
    }
    // Только смена шаблона / режима — не onInput (см. templateContentEpoch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateContentEpoch, editorMode, editingId]);

  useEffect(() => {
    if (loading) return;
    if (templateTabSwitchRef.current || templateArchiveSwitchRef.current) return;
    applyLibraryTemplateSelection(itemsRef.current, activeTemplateTab);
  }, [
    loading,
    activeLibraryKind,
    activeTemplateTab,
    showArchivedTemplates,
    applyLibraryTemplateSelection,
    itemsRef,
    templateArchiveSwitchRef,
    templateTabSwitchRef,
  ]);

  return {
    applyLibraryTemplateSelection,
    applyTemplateHistorySnapshot,
    commitTemplateHtmlToState,
    editorMode,
    ensureTemplateDraftForEditing,
    handleTemplateHtmlFileImport,
    html,
    htmlTextareaRef,
    pushTemplateHistory,
    resetTemplateHistory,
    schedulePushTemplateHistoryFromHtml,
    setEditorMode,
    setHtml,
    setVisualDraftHtml,
    switchEditorMode,
    syncVisualEditorToHtmlState,
    tableEditActive,
    setTableEditActive,
    templateHistory,
    templateHistoryIndex,
    templateHistoryIndexRef,
    templateHistoryRef,
    setTemplateHistoryIndex,
    visualDraftHtml,
    visualEditorRef,
    visualSelectionRangeRef,
  };
}
