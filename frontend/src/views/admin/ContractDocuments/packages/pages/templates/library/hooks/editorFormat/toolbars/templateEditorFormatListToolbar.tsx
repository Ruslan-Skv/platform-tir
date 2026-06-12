'use client';

import { ListBulletIcon, NumberedListIcon } from '@heroicons/react/24/outline';

import {
  BULLET_MARKER_OPTIONS,
  type BulletMarkerId,
  LIST_TOOLTIP,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateLists';
import { REMARK_BLANK_LINES_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateRemarkBlankLines';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import {
  FormatToolbarGlyph,
  FormatToolbarHelpTooltip,
  FormatToolbarSvgIcon,
} from '../../../editor/templateEditorFormatToolbar';
import type { TemplateEditorFormatToolbarUiProps } from './templateEditorFormatTools';

export function TemplateEditorFormatListToolbar({
  isSuperAdmin,
  handlers,
}: Pick<TemplateEditorFormatToolbarUiProps, 'isSuperAdmin' | 'handlers'>) {
  const {
    applyBulletedList,
    applyMultilevelContractList,
    applyNumberedList,
    bulletMarker,
    setBulletMarker,
    changeListLevel,
    insertRemarkBlankLines,
    packageContractLegalListsInEditor,
  } = handlers;

  return (
    <>
      <span className={cdTemplates.formatToolbarListGroup}>
        <select
          className={cdTemplates.formatToolbarListMarkerSelect}
          value={bulletMarker}
          disabled={!isSuperAdmin}
          aria-label="Вид маркера маркированного списка"
          title="Вид маркера"
          onChange={(e) => setBulletMarker(e.target.value as BulletMarkerId)}
        >
          {BULLET_MARKER_OPTIONS.map((option) => (
            <option key={option.id} value={option.id} title={option.title}>
              {option.glyph}
            </option>
          ))}
        </select>
        <FormatToolbarHelpTooltip
          title={LIST_TOOLTIP.bullet.title}
          steps={LIST_TOOLTIP.bullet.steps}
          note={LIST_TOOLTIP.bullet.note}
          disabled={!isSuperAdmin}
          onClick={applyBulletedList}
        >
          <FormatToolbarSvgIcon icon={ListBulletIcon} />
        </FormatToolbarHelpTooltip>
      </span>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.numbered.title}
        steps={LIST_TOOLTIP.numbered.steps}
        note={LIST_TOOLTIP.numbered.note}
        disabled={!isSuperAdmin}
        onClick={applyNumberedList}
      >
        <FormatToolbarSvgIcon icon={NumberedListIcon} />
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.multilevel.title}
        steps={LIST_TOOLTIP.multilevel.steps}
        note={LIST_TOOLTIP.multilevel.note}
        disabled={!isSuperAdmin}
        onClick={applyMultilevelContractList}
      >
        <FormatToolbarGlyph>1.</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.outdent.title}
        steps={LIST_TOOLTIP.outdent.steps}
        note={LIST_TOOLTIP.outdent.note}
        disabled={!isSuperAdmin}
        onClick={() => changeListLevel('outdent')}
      >
        <FormatToolbarGlyph>⇤</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={LIST_TOOLTIP.indent.title}
        steps={LIST_TOOLTIP.indent.steps}
        note={LIST_TOOLTIP.indent.note}
        disabled={!isSuperAdmin}
        onClick={() => changeListLevel('indent')}
      >
        <FormatToolbarGlyph>⇥</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title={REMARK_BLANK_LINES_TOOLTIP.title}
        steps={REMARK_BLANK_LINES_TOOLTIP.steps}
        note={REMARK_BLANK_LINES_TOOLTIP.note}
        disabled={!isSuperAdmin}
        onClick={insertRemarkBlankLines}
      >
        <FormatToolbarGlyph>2⏎</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
      <FormatToolbarHelpTooltip
        title="Починить списки"
        steps={[
          'Если пустой подпункт мешает — нажмите эту кнопку.',
          'Убирается лишний обычный список, выравнивается структура 1 / 1.1 и пустые пункты.',
          'После исправления сохраните шаблон.',
        ]}
        note="Выполняется автоматически при открытии и сохранении шаблона."
        disabled={!isSuperAdmin}
        onClick={packageContractLegalListsInEditor}
      >
        <FormatToolbarGlyph>Списки</FormatToolbarGlyph>
      </FormatToolbarHelpTooltip>
    </>
  );
}
