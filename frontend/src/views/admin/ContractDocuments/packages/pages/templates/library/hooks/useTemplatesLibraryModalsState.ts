import { useState } from 'react';

export type TemplateTrashPending = {
  presetId: string;
  name: string;
};

export function useTemplatesLibraryModalsState() {
  const [trashOpen, setTrashOpen] = useState(false);
  const [templateTrashPending, setTemplateTrashPending] = useState<TemplateTrashPending | null>(
    null
  );
  const [templateArchivePending, setTemplateArchivePending] = useState<TemplateTrashPending | null>(
    null
  );

  return {
    trashOpen,
    setTrashOpen,
    templateTrashPending,
    setTemplateTrashPending,
    templateArchivePending,
    setTemplateArchivePending,
  };
}
