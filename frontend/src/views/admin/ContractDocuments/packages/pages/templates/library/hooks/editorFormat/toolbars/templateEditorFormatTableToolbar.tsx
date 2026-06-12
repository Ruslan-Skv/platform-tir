'use client';

import { INSERT_BLOCK_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateInsertBlocks';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import {
  FormatToolbarGlyph,
  FormatToolbarHelpTooltip,
} from '../../../editor/templateEditorFormatToolbar';
import type { TemplateEditorFormatToolbarUiProps } from './templateEditorFormatTools';

export function TemplateEditorFormatTableToolbar({
  isSuperAdmin,
  tableEditActive,
  handlers,
}: Pick<TemplateEditorFormatToolbarUiProps, 'isSuperAdmin' | 'tableEditActive' | 'handlers'>) {
  const { handleAddTableColumn, handleAddTableRow } = handlers;

  return (
    <span className={cdTemplates.formatToolbarTableGroup}>
      <FormatToolbarHelpTooltip
        title={INSERT_BLOCK_TOOLTIP.tableAddRow.title}
        steps={INSERT_BLOCK_TOOLTIP.tableAddRow.steps}
        note={INSERT_BLOCK_TOOLTIP.tableAddRow.note}
        disabled={!isSuperAdmin || !tableEditActive}
        onClick={handleAddTableRow}
      >
        <FormatToolbarGlyph>+стр</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={INSERT_BLOCK_TOOLTIP.tableAddColumn.title}
        steps={INSERT_BLOCK_TOOLTIP.tableAddColumn.steps}
        note={INSERT_BLOCK_TOOLTIP.tableAddColumn.note}
        disabled={!isSuperAdmin || !tableEditActive}
        onClick={handleAddTableColumn}
      >
        <FormatToolbarGlyph>+стб</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
    </span>
  );
}
