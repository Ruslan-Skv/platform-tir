import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import type { PackageTemplatePreviewCustomerKind } from '@/views/admin/ContractDocuments/packages/platform/form/packageForm';

export const TEMPLATES_UI_PREFS_KEY = 'admin.contractDocuments.templates.uiPrefs';
export const TEMPLATES_PLACEHOLDERS_COLLAPSED_KEY =
  'admin.contractDocuments.templates.placeholdersCollapsed';
export const TEMPLATES_ACTIVE_KIND_KEY = 'admin.contractDocuments.templates.activeKind';
export const TEMPLATES_ACTIVE_TAB_KEY = 'admin.contractDocuments.templates.activeTab';
export const TEMPLATES_ARCHIVE_MODE_KEY = 'admin.contractDocuments.templates.archiveMode';
export const TEMPLATES_PREVIEW_CUSTOMER_KIND_KEY =
  'admin.contractDocuments.templates.previewCustomerKind';
export const TEMPLATES_PREVIEW_ZOOM_KEY = 'admin.contractDocuments.templates.previewZoomPct';
export const TEMPLATES_VISUAL_ZOOM_KEY = 'admin.contractDocuments.templates.visualZoomPct';
export const TEMPLATES_VISUAL_HEIGHT_KEY = 'admin.contractDocuments.templates.visualEditorHeightPx';
export const TEMPLATES_PREVIEW_HEIGHT_KEY = 'admin.contractDocuments.templates.previewPaneHeightPx';
export const TEMPLATES_EDITOR_MODE_KEY = 'admin.contractDocuments.templates.editorMode';
export const TEMPLATES_HTML_HEIGHT_KEY = 'admin.contractDocuments.templates.htmlEditorHeightPx';
export type NormalizeMode = 'soft' | 'strict';
export type TemplatesUiPrefs = {
  previewZoomPct?: number;
  visualZoomPct?: number;
  visualEditorHeightPx?: number;
  previewPaneHeightPx?: number;
  editorMode?: 'html' | 'visual';
  htmlEditorHeightPx?: number;
  activeLibraryKind?: ContractDocumentPackageKind;
  activeTemplateTab?: string;
  previewCustomerKind?: PackageTemplatePreviewCustomerKind;
  showArchivedTemplates?: boolean;
  placeholdersCollapsed?: boolean;
  selectedTemplateByScope?: Record<string, string>;
};

export const TEMPLATE_HTML_HISTORY_DEBOUNCE_MS = 400;
