'use client';

import { SparklesIcon } from '@heroicons/react/24/outline';

import { CLEANUP_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateTypography';

import {
  FormatToolbarGlyph,
  FormatToolbarHelpTooltip,
  FormatToolbarSvgIcon,
} from '../../../editor/templateEditorFormatToolbar';
import type { TemplateEditorFormatToolbarUiProps } from './templateEditorFormatTools';

export function TemplateEditorFormatCleanupToolbar({
  isSuperAdmin,
  handlers,
}: Pick<TemplateEditorFormatToolbarUiProps, 'isSuperAdmin' | 'handlers'>) {
  const { clearFormattingInSelection, normalizeContractTypographyInEditor, normalizeTemplateText } =
    handlers;

  return (
    <>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.normalizeSoft.title}
        steps={CLEANUP_TOOLTIP.normalizeSoft.steps}
        note={CLEANUP_TOOLTIP.normalizeSoft.note}
        disabled={!isSuperAdmin}
        onClick={() => normalizeTemplateText('soft')}
      >
        <FormatToolbarSvgIcon icon={SparklesIcon} />
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.normalizeStrict.title}
        steps={CLEANUP_TOOLTIP.normalizeStrict.steps}
        note={CLEANUP_TOOLTIP.normalizeStrict.note}
        disabled={!isSuperAdmin}
        wideGlyph
        onClick={() => normalizeTemplateText('strict')}
      >
        <FormatToolbarGlyph>N+</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.clearFormat.title}
        steps={CLEANUP_TOOLTIP.clearFormat.steps}
        note={CLEANUP_TOOLTIP.clearFormat.note}
        disabled={!isSuperAdmin}
        onClick={clearFormattingInSelection}
      >
        <FormatToolbarGlyph>Tx</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={CLEANUP_TOOLTIP.wordTypography.title}
        steps={CLEANUP_TOOLTIP.wordTypography.steps}
        note={CLEANUP_TOOLTIP.wordTypography.note}
        disabled={!isSuperAdmin}
        onClick={normalizeContractTypographyInEditor}
      >
        <FormatToolbarGlyph>Tt</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
    </>
  );
}
