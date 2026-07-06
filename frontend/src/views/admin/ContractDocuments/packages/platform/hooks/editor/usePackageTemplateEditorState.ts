import { useState } from 'react';

/** Состояние шаблона при загрузке пакета (редактирование — только в библиотеке шаблонов). */
export function usePackageTemplateEditorState() {
  const [_editingTemplateId, setEditingTemplateId] = useState('');
  const [_templateDraftTitle, setTemplateDraftTitle] = useState('');
  const [_templateDraftHtml, setTemplateDraftHtml] = useState('');

  return {
    templateLoadSetters: {
      setEditingTemplateId,
      setTemplateDraftTitle,
      setTemplateDraftHtml,
    },
  };
}
