import type {
  ContractDocumentPackageKind,
  ContractTemplatePreset,
} from '@/shared/api/admin-contract-document-packages';
import type { PackageLibraryTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageLibraryTemplateTabs';

export type UseTemplatesLibraryMutationsParams = {
  isSuperAdmin: boolean;
  activeLibraryKind: ContractDocumentPackageKind;
  activeTemplateTab: PackageLibraryTemplateTabId;
  showArchivedTemplates: boolean;
  loading: boolean;
  items: ContractTemplatePreset[];
  setItems: React.Dispatch<React.SetStateAction<ContractTemplatePreset[]>>;
  itemsByActiveTab: ContractTemplatePreset[];
  itemsRef: React.RefObject<ContractTemplatePreset[]>;
  editingId: string;
  setEditingId: React.Dispatch<React.SetStateAction<string>>;
  title: string;
  setTitle: React.Dispatch<React.SetStateAction<string>>;
  html: string;
  setHtml: React.Dispatch<React.SetStateAction<string>>;
  visualDraftHtml: string;
  setVisualDraftHtml: React.Dispatch<React.SetStateAction<string>>;
  editorMode: 'html' | 'visual';
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setOk: React.Dispatch<React.SetStateAction<string | null>>;
  setTitleRenameMode: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTemplateTab: React.Dispatch<React.SetStateAction<PackageLibraryTemplateTabId>>;
  setAutosaveSavedVisible: React.Dispatch<React.SetStateAction<boolean>>;
  ensureTemplateDraftForEditing: () => string;
  commitTemplateHtmlToState: (raw: string) => string;
  resetTemplateHistory: (htmlSnapshot: string) => void;
  applyLibraryTemplateSelection: (
    list: ContractTemplatePreset[],
    tab: PackageLibraryTemplateTabId
  ) => void;
  refreshTrashCount: () => void;
  visualEditorRef: React.RefObject<HTMLDivElement | null>;
  autosaveTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  lastSavedSnapshotRef: React.MutableRefObject<string>;
  isInitialHydrationRef: React.MutableRefObject<boolean>;
  templateTabSwitchRef: React.MutableRefObject<boolean>;
  templateArchiveSwitchRef: React.MutableRefObject<boolean>;
  preferredTemplateIdsRef: React.MutableRefObject<Record<string, string>>;
  templatesScopeKey: (
    kind: ContractDocumentPackageKind,
    tab: PackageLibraryTemplateTabId,
    archived: boolean
  ) => string;
  templateTrashPending: { presetId: string; name: string } | null;
  setTemplateTrashPending: React.Dispatch<
    React.SetStateAction<{ presetId: string; name: string } | null>
  >;
  templateArchivePending: { presetId: string; name: string } | null;
  setTemplateArchivePending: React.Dispatch<
    React.SetStateAction<{ presetId: string; name: string } | null>
  >;
};

export type TemplatesLibraryMutationsPersistApi = {
  persist: (next: ContractTemplatePreset[], successText: string) => Promise<boolean>;
  buildItemsForAutosave: () => ContractTemplatePreset[] | null;
  persistItemsSnapshot: (next: ContractTemplatePreset[]) => Promise<void>;
  persistAutosave: () => Promise<void>;
  flushAutosave: () => Promise<void>;
};
