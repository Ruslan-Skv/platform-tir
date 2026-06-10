import { useCallback, useState } from 'react';

import { clampTemplateEditorZoomPct } from '@/views/admin/ContractDocuments/packages/platform/templateEditorHistory';

import { clampInt } from '../templatesLibraryHtmlNormalize';
import {
  TEMPLATES_HTML_HEIGHT_KEY,
  TEMPLATES_PREVIEW_HEIGHT_KEY,
  TEMPLATES_VISUAL_HEIGHT_KEY,
} from '../templatesLibraryStorage';

export type UseTemplatesLibraryPreviewUiParams = {
  uiPrefsLoadedRef: React.MutableRefObject<boolean>;
  htmlTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  visualEditorRef: React.RefObject<HTMLDivElement | null>;
  previewPaneRef: React.RefObject<HTMLDivElement | null>;
};

export function useTemplatesLibraryPreviewUi({
  uiPrefsLoadedRef,
  htmlTextareaRef,
  visualEditorRef,
  previewPaneRef,
}: UseTemplatesLibraryPreviewUiParams) {
  const [previewZoomPct, setPreviewZoomPct] = useState(100);
  const [previewZoomDraft, setPreviewZoomDraft] = useState<string | null>(null);
  const [visualZoomPct, setVisualZoomPct] = useState(100);
  const [visualZoomDraft, setVisualZoomDraft] = useState<string | null>(null);
  const [htmlEditorHeightPx, setHtmlEditorHeightPx] = useState<number | null>(null);
  const [visualEditorHeightPx, setVisualEditorHeightPx] = useState<number | null>(null);
  const [previewPaneHeightPx, setPreviewPaneHeightPx] = useState<number | null>(null);

  const captureVisualEditorHeight = () => {
    const h = visualEditorRef.current?.offsetHeight;
    if (!h) return;
    const next = clampInt(h, 220, 2400);
    setVisualEditorHeightPx(next);
    if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
      try {
        window.localStorage.setItem(TEMPLATES_VISUAL_HEIGHT_KEY, String(next));
      } catch {
        // ignore localStorage write issues
      }
    }
  };

  const capturePreviewPaneHeight = () => {
    const h = previewPaneRef.current?.offsetHeight;
    if (!h) return;
    const next = clampInt(h, 220, 2400);
    setPreviewPaneHeightPx(next);
    if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
      try {
        window.localStorage.setItem(TEMPLATES_PREVIEW_HEIGHT_KEY, String(next));
      } catch {
        // ignore localStorage write issues
      }
    }
  };

  const captureHtmlEditorHeight = () => {
    const h = htmlTextareaRef.current?.offsetHeight;
    if (!h) return;
    const next = clampInt(h, 220, 2400);
    setHtmlEditorHeightPx(next);
    if (typeof window !== 'undefined' && uiPrefsLoadedRef.current) {
      try {
        window.localStorage.setItem(TEMPLATES_HTML_HEIGHT_KEY, String(next));
      } catch {
        // ignore localStorage write issues
      }
    }
  };

  const commitVisualZoomDraft = useCallback(() => {
    const raw = (visualZoomDraft ?? '').trim();
    setVisualZoomDraft(null);
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    setVisualZoomPct(clampTemplateEditorZoomPct(n));
  }, [visualZoomDraft]);

  const stepVisualZoom = useCallback((delta: number) => {
    setVisualZoomDraft(null);
    setVisualZoomPct((prev) => clampTemplateEditorZoomPct(prev + delta));
  }, []);

  const commitPreviewZoomDraft = useCallback(() => {
    const raw = (previewZoomDraft ?? '').trim();
    setPreviewZoomDraft(null);
    if (!raw) return;
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return;
    setPreviewZoomPct(clampTemplateEditorZoomPct(n));
  }, [previewZoomDraft]);

  const stepPreviewZoom = useCallback((delta: number) => {
    setPreviewZoomDraft(null);
    setPreviewZoomPct((prev) => clampTemplateEditorZoomPct(prev + delta));
  }, []);

  return {
    captureHtmlEditorHeight,
    capturePreviewPaneHeight,
    captureVisualEditorHeight,
    commitPreviewZoomDraft,
    commitVisualZoomDraft,
    htmlEditorHeightPx,
    previewPaneHeightPx,
    previewZoomDraft,
    previewZoomPct,
    setHtmlEditorHeightPx,
    setPreviewPaneHeightPx,
    setPreviewZoomDraft,
    setPreviewZoomPct,
    setVisualEditorHeightPx,
    setVisualZoomDraft,
    setVisualZoomPct,
    stepPreviewZoom,
    stepVisualZoom,
    visualEditorHeightPx,
    visualZoomDraft,
    visualZoomPct,
  };
}
