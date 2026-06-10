'use client';

import {
  ArrowsPointingOutIcon,
  BuildingOffice2Icon,
  ChatBubbleBottomCenterTextIcon,
  ListBulletIcon,
  MinusIcon,
  NumberedListIcon,
  PencilSquareIcon,
  SparklesIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

import { INSERT_BLOCK_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateInsertBlocks';
import {
  BULLET_MARKER_OPTIONS,
  type BulletMarkerId,
  LIST_TOOLTIP,
} from '@/views/admin/ContractDocuments/core/typography/contractTemplateLists';
import { REMARK_BLANK_LINES_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateRemarkBlankLines';
import { CLEANUP_TOOLTIP } from '@/views/admin/ContractDocuments/core/typography/contractTemplateTypography';

import cdTemplates from '../../../../styles/templates-library.module.css';
import {
  type FormatTool,
  FormatToolbarGlyph,
  FormatToolbarHelpTooltip,
  FormatToolbarSvgIcon,
  FormatToolbarTextAlignIcon,
} from '../../editor/templateEditorFormatToolbar';
import type { TemplateEditorFormatHandlers } from './useTemplateEditorFormatHandlers';
import type { TemplateEditorFormatSelection } from './useTemplateEditorFormatSelection';

export type TemplateEditorFormatToolbarUiProps = {
  isSuperAdmin: boolean;
  editorMode: 'html' | 'visual';
  tableEditActive: boolean;
  switchEditorMode: (mode: 'html' | 'visual') => void;
  selection: Pick<
    TemplateEditorFormatSelection,
    'headingLevelActive' | 'inlineFormatActive' | 'paragraphAlignActive'
  >;
  handlers: TemplateEditorFormatHandlers;
};

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

export function buildTemplateEditorFormatTools({
  selection,
  handlers,
}: Pick<TemplateEditorFormatToolbarUiProps, 'selection' | 'handlers'>): FormatTool[] {
  const { headingLevelActive, inlineFormatActive, paragraphAlignActive } = selection;
  const {
    applyCompactContractSpacing,
    insertActHandwrittenCustomerSignatures,
    insertHorizontalRule,
    insertPageBreak,
    insertQuoteBlock,
    insertRequisitesTemplate,
    insertSignatureLines,
    insertSimpleTable,
    toggleInlineFormat,
    toggleUppercaseSelection,
    wrapAsHeading,
    wrapParagraphWithAlign,
    wrapParagraphWithIndent,
    wrapParagraphWithIndentCm,
    wrapParagraphWithSpacing,
  } = handlers;

  return [
    {
      id: 'h1',
      title: 'Заголовок H1',
      icon: <FormatToolbarGlyph>H1</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(1),
      isActive: headingLevelActive === 1,
      ariaPressed: headingLevelActive === 1,
    },
    {
      id: 'h2',
      title: 'Заголовок H2',
      icon: <FormatToolbarGlyph>H2</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(2),
      isActive: headingLevelActive === 2,
      ariaPressed: headingLevelActive === 2,
    },
    {
      id: 'h3',
      title: 'Заголовок H3',
      icon: <FormatToolbarGlyph>H3</FormatToolbarGlyph>,
      onClick: () => wrapAsHeading(3),
      isActive: headingLevelActive === 3,
      ariaPressed: headingLevelActive === 3,
    },
    {
      id: 'align-left',
      title: 'Выравнивание по левому краю',
      icon: <FormatToolbarTextAlignIcon kind="left" />,
      onClick: () => wrapParagraphWithAlign('left'),
      isActive: paragraphAlignActive === 'left',
      ariaPressed: paragraphAlignActive === 'left',
    },
    {
      id: 'align-center',
      title: 'Выравнивание по центру',
      icon: <FormatToolbarTextAlignIcon kind="center" />,
      onClick: () => wrapParagraphWithAlign('center'),
      isActive: paragraphAlignActive === 'center',
      ariaPressed: paragraphAlignActive === 'center',
    },
    {
      id: 'align-right',
      title: 'Выравнивание по правому краю',
      icon: <FormatToolbarTextAlignIcon kind="right" />,
      onClick: () => wrapParagraphWithAlign('right'),
      isActive: paragraphAlignActive === 'right',
      ariaPressed: paragraphAlignActive === 'right',
    },
    {
      id: 'align-justify',
      title: 'Выравнивание по ширине',
      icon: <FormatToolbarTextAlignIcon kind="justify" />,
      onClick: () => wrapParagraphWithAlign('justify'),
      isActive: paragraphAlignActive === 'justify',
      ariaPressed: paragraphAlignActive === 'justify',
    },
    {
      id: 'paragraph-indent',
      title: 'Красная строка 1,25 см для текущего абзаца (не создаёт новый)',
      icon: <FormatToolbarGlyph>¶</FormatToolbarGlyph>,
      onClick: wrapParagraphWithIndent,
    },
    {
      id: 'indent-none',
      title: 'Убрать отступ первой строки у текущего абзаца',
      icon: <FormatToolbarGlyph>⇤</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithIndentCm(0),
    },
    {
      id: 'indent-125',
      title: 'Отступ первой строки 1,25 см',
      icon: <FormatToolbarGlyph>⇥</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithIndentCm(1.25),
    },
    {
      id: 'spacing-tight',
      title: 'Узкий межстрочный интервал (выделенный абзац)',
      icon: <FormatToolbarGlyph>↕</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithSpacing(1.3, 6),
    },
    {
      id: 'spacing-wide',
      title: 'Широкий межстрочный интервал (выделенный абзац)',
      icon: <FormatToolbarGlyph>⇕</FormatToolbarGlyph>,
      onClick: () => wrapParagraphWithSpacing(1.6, 10),
    },
    {
      id: 'spacing-contract-dense',
      title:
        'Уплотнить / разредить договор (≡): весь договор без выделения; с выделением — только выбранные абзацы. Повторный клик — обратно',
      icon: <FormatToolbarGlyph>≡</FormatToolbarGlyph>,
      onClick: applyCompactContractSpacing,
      help: {
        title: 'Интервалы между абзацами',
        steps: [
          'Без выделения: переключает весь договор (уплотнить ↔ обычные отступы).',
          'С выделенным текстом: только затронутые абзацы и заголовки разделов.',
          'Повторный клик по ≡ возвращает прежние отступы (≈6pt между абзацами).',
        ],
        note: 'Сохраните шаблон и проверьте печать. Для одного абзаца можно выделить его и нажать ≡.',
      },
    },
    {
      id: 'bold',
      title: 'Жирный (Ж)',
      icon: <FormatToolbarGlyph>Ж</FormatToolbarGlyph>,
      onClick: () => toggleInlineFormat('bold'),
      isActive: inlineFormatActive.bold,
      ariaPressed: inlineFormatActive.bold,
    },
    {
      id: 'italic',
      title: 'Курсив (К)',
      icon: <FormatToolbarGlyph>К</FormatToolbarGlyph>,
      onClick: () => toggleInlineFormat('italic'),
      isActive: inlineFormatActive.italic,
      ariaPressed: inlineFormatActive.italic,
    },
    {
      id: 'underline',
      title: 'Подчёркивание (Ч)',
      icon: <FormatToolbarGlyph>Ч</FormatToolbarGlyph>,
      onClick: () => toggleInlineFormat('underline'),
      isActive: inlineFormatActive.underline,
      ariaPressed: inlineFormatActive.underline,
    },
    {
      id: 'uppercase',
      title: 'Верхний регистр (повторный клик — нижний регистр)',
      icon: <FormatToolbarGlyph>AA</FormatToolbarGlyph>,
      onClick: toggleUppercaseSelection,
    },
    {
      id: 'signatures',
      title: 'Подписи сторон',
      icon: <FormatToolbarSvgIcon icon={PencilSquareIcon} />,
      onClick: insertSignatureLines,
    },
    {
      id: 'signatures-act-handwritten',
      title: INSERT_BLOCK_TOOLTIP.signaturesActHandwritten.title,
      icon: <FormatToolbarGlyph>Пдп</FormatToolbarGlyph>,
      onClick: insertActHandwrittenCustomerSignatures,
      help: INSERT_BLOCK_TOOLTIP.signaturesActHandwritten,
    },
    {
      id: 'requisites',
      title: 'Реквизиты (готовый блок)',
      icon: <FormatToolbarSvgIcon icon={BuildingOffice2Icon} />,
      onClick: insertRequisitesTemplate,
    },
    {
      id: 'quote',
      title: INSERT_BLOCK_TOOLTIP.noteBlock.title,
      icon: <FormatToolbarSvgIcon icon={ChatBubbleBottomCenterTextIcon} />,
      onClick: insertQuoteBlock,
      help: INSERT_BLOCK_TOOLTIP.noteBlock,
    },
    {
      id: 'table-2x2',
      title: INSERT_BLOCK_TOOLTIP.tableSimple.title,
      icon: <FormatToolbarSvgIcon icon={TableCellsIcon} />,
      onClick: insertSimpleTable,
      help: INSERT_BLOCK_TOOLTIP.tableSimple,
    },
    {
      id: 'hr',
      title: 'Горизонтальный разделитель',
      icon: <FormatToolbarSvgIcon icon={MinusIcon} />,
      onClick: insertHorizontalRule,
    },
    {
      id: 'page-break',
      title: INSERT_BLOCK_TOOLTIP.pageBreak.title,
      icon: <FormatToolbarSvgIcon icon={ArrowsPointingOutIcon} />,
      onClick: insertPageBreak,
      help: INSERT_BLOCK_TOOLTIP.pageBreak,
    },
  ];
}

export function TemplateEditorModeToggle({
  editorMode,
  switchEditorMode,
}: Pick<TemplateEditorFormatToolbarUiProps, 'editorMode' | 'switchEditorMode'>) {
  return (
    <div
      className={`${cdTemplates.formatLevelBar} ${cdTemplates.templatesLibraryEditorModeToggle}`}
      role="group"
      aria-label="Режим редактора шаблона"
    >
      <button
        type="button"
        className={
          editorMode === 'html' ? cdTemplates.formatLevelBtnActive : cdTemplates.formatLevelBtn
        }
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => switchEditorMode('html')}
      >
        HTML
      </button>
      <button
        type="button"
        className={
          editorMode === 'visual' ? cdTemplates.formatLevelBtnActive : cdTemplates.formatLevelBtn
        }
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => switchEditorMode('visual')}
      >
        Визуальный конструктор
      </button>
    </div>
  );
}
