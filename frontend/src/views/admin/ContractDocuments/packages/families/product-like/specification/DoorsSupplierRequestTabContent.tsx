'use client';

import { useState } from 'react';

import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdHubModals from '../../../../styles/hub-modals.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { DoorsSpecificationLinesEditor } from './DoorsSpecificationLinesEditor';
import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
  ensureAtLeastOneDoorsSpecificationLine,
  lineSpecificationAttributeColumns,
  lineSpecificationAttributeValue,
} from './doorsSpecification';
import type { DoorsSupplierRequestApplyResult } from './doorsSupplierRequest';
import { useDoorsSupplierOptions } from './useDoorsSupplierOptions';

const REQUEST_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact} ${cdHubModals.estimateTabCompact}`;
const REQUEST_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
const REQUEST_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact} ${cdHubModals.dataCompact}`;
const REQUEST_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
const REQUEST_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const REQUEST_SECTION_TITLE = cdEstimateTab.sectionTitle;
const REQUEST_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const REQUEST_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const REQUEST_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;
const REQUEST_ROOT = `${REQUEST_BLOCK} ${REQUEST_DATA_COMPACT} ${REQUEST_TAB_COMPACT} ${cdProduct.windowsContractTabTypography}`;

type DoorsSupplierRequestTabContentProps = {
  packageKind: 'DOORS';
  /** Позиции неизменной Спецификации — база для предзаполнения панели правки. */
  specificationLines: DoorsSpecificationLine[];
  /** Правки заявки после «Сохранить»; null — заявку ещё не редактировали. */
  requestLines: DoorsSpecificationLine[] | null;
  /** Номер Д/с, в котором оформлены изменения заявки (если есть). */
  linkedAddendumOrdinal: number | null;
  contractNumberLabel: string;
  contractDateLabel: string;
  executorTitle: string;
  /** Применение правок: обновление заявки + создание/обновление Д/с. */
  onApplyEdit: (lines: DoorsSpecificationLine[]) => DoorsSupplierRequestApplyResult;
  /** Переход на вкладку Д/с №N. */
  onOpenAddendum: (ordinal: number) => void;
};

type SupplierRequestGroup = {
  /** Ключ группы: supplierId или '' для позиций без поставщика. */
  key: string;
  supplierName: string;
  lines: DoorsSpecificationLine[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Группировка позиций спецификации по поставщику; порядок групп — как в спецификации. */
function groupDoorsSpecificationLinesBySupplier(
  lines: DoorsSpecificationLine[]
): SupplierRequestGroup[] {
  const groups: SupplierRequestGroup[] = [];
  const byKey = new Map<string, SupplierRequestGroup>();
  for (const line of lines.filter(doorsSpecificationLineHasContent)) {
    const key = line.supplierId || line.supplierName.trim() || '';
    let group = byKey.get(key);
    if (!group) {
      group = { key, supplierName: line.supplierName.trim(), lines: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.lines.push(line);
  }
  return groups;
}

/** Word-совместимый HTML (mime application/msword): Word открывает файл с таблицей и стилями. */
function buildSupplierRequestWordHtml(input: {
  lines: DoorsSpecificationLine[];
  supplierName: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  executorTitle: string;
}): string {
  const attrs = lineSpecificationAttributeColumns('DOORS');
  const th = (label: string) =>
    `<th style="border:1px solid #94a3b8;padding:1pt 4pt;background:#f1f5f9;text-align:center;font-size:10pt;">${escapeHtml(label)}</th>`;
  const td = (value: string, align: 'left' | 'center' | 'right' = 'left') =>
    `<td style="border:1px solid #94a3b8;padding:1pt 4pt;text-align:${align};font-size:10pt;">${escapeHtml(value.trim() || '—')}</td>`;
  const table = `<table style="width:100%;border-collapse:collapse;margin:10pt 0;">
<thead><tr>${th('№')}${attrs.map((c) => th(c.label)).join('')}${th('Кол-во')}</tr></thead>
<tbody>${input.lines
    .map(
      (line, i) =>
        `<tr><td style="border:1px solid #94a3b8;padding:1pt 4pt;text-align:center;">${i + 1}</td>${attrs
          .map((c) => td(lineSpecificationAttributeValue(line, c.id)))
          .join('')}${td(line.quantity, 'right')}</tr>`
    )
    .join('')}</tbody></table>`;
  const supplierLine = input.supplierName
    ? `<p style="margin:0 0 6pt;">Поставщик: <strong>${escapeHtml(input.supplierName)}</strong></p>`
    : '';
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Заявка № ${escapeHtml(input.contractNumberLabel)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
body{font-family:'Times New Roman',serif;font-size:11pt;}
@page{margin:2cm;}
table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
table td,table th{font-size:10pt;line-height:10.5pt;mso-line-height-rule:exactly;mso-padding-alt:0cm 0.1cm 0cm 0.1cm;}
</style></head>
<body>
<p style="margin:0 0 4pt;">Заявка № ${escapeHtml(input.contractNumberLabel)} от ${escapeHtml(input.contractDateLabel)}</p>
<h3 style="margin:0 0 10pt;text-align:center;">Заявка поставщику</h3>
${supplierLine}<p style="margin:0 0 10pt;">От кого: <strong>${escapeHtml(input.executorTitle.trim() || '—')}</strong></p>
${table}
</body></html>`;
}

function triggerWordDownload(html: string, fileName: string): void {
  const blob = new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function downloadSupplierRequest(input: {
  group: SupplierRequestGroup;
  contractNumberLabel: string;
  contractDateLabel: string;
  executorTitle: string;
}): void {
  const html = buildSupplierRequestWordHtml({
    lines: input.group.lines,
    supplierName: input.group.supplierName,
    contractNumberLabel: input.contractNumberLabel,
    contractDateLabel: input.contractDateLabel,
    executorTitle: input.executorTitle,
  });
  const suffix = input.group.supplierName ? ` (${input.group.supplierName})` : '';
  const fileName = `Заявка № ${input.contractNumberLabel.trim() || 'без номера'}${suffix} от ${input.contractDateLabel.trim() || 'без даты'}.doc`;
  triggerWordDownload(html, fileName);
}

type SaveNotice =
  | { kind: 'addendum'; ordinal: number }
  | { kind: 'noChanges' }
  | { kind: 'exhausted' };

/**
 * Вкладка «Заявка» пакета «Двери»: автоформируется из строк Спецификации — по подвкладке на
 * поставщика. Ведущий специалист может отредактировать заявку («Отредактировать заявку»):
 * правки не меняют Спецификацию, а оформляются доп. соглашением к пакету.
 */
export function DoorsSupplierRequestTabContent({
  specificationLines,
  requestLines,
  linkedAddendumOrdinal,
  contractNumberLabel,
  contractDateLabel,
  executorTitle,
  onApplyEdit,
  onOpenAddendum,
}: DoorsSupplierRequestTabContentProps) {
  const savedLines = requestLines ?? specificationLines;
  const [editing, setEditing] = useState(false);
  const [draftLines, setDraftLines] = useState<DoorsSpecificationLine[]>([]);
  const [saveNotice, setSaveNotice] = useState<SaveNotice | null>(null);
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const supplierOptions = useDoorsSupplierOptions('DOORS');

  const startEditing = () => {
    setDraftLines(ensureAtLeastOneDoorsSpecificationLine(savedLines.map((line) => ({ ...line }))));
    setSaveNotice(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setDraftLines([]);
  };

  const saveEditing = () => {
    const result = onApplyEdit(draftLines);
    setEditing(false);
    setDraftLines([]);
    if (result.addendumSlotsExhausted) {
      setSaveNotice({ kind: 'exhausted' });
    } else if (result.addendumSlotOrdinal !== null) {
      setSaveNotice({ kind: 'addendum', ordinal: result.addendumSlotOrdinal });
    } else {
      setSaveNotice({ kind: 'noChanges' });
    }
  };

  if (editing) {
    return (
      <div className={REQUEST_ROOT}>
        <div className={REQUEST_FORM_GRID}>
          <div className={`${REQUEST_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
            <h3 className={`${REQUEST_SECTION_TITLE} ${REQUEST_SECTION_TITLE_MAIN}`}>
              Правка заявки
            </h3>
            <p className={REQUEST_HINT} style={{ marginTop: 0 }}>
              Заявка предзаполнена позициями Спецификации. Измените количество, добавьте или удалите
              товары — исходная Спецификация остаётся неизменной: после «Сохранить» разница
              автоматически оформится доп. соглашением к договору.
            </p>
            <DoorsSpecificationLinesEditor
              packageKind="DOORS"
              lines={draftLines}
              readOnly={false}
              onChange={setDraftLines}
              supplierOptions={supplierOptions}
              totalLabel="Итого по заявке"
            />
            <div className={cdProduct.doorsSpecificationActionsRow}>
              <button
                data-admin-mutation
                type="button"
                className={cdWorkspace.primaryBtn}
                onClick={saveEditing}
              >
                Сохранить
              </button>
              <button type="button" className={cdWorkspace.secondaryBtn} onClick={cancelEditing}>
                Отмена
              </button>
            </div>
          </div>

          <div
            className={`${cdEstimateTab.fieldSpanAll} ${cdProduct.estimateSheetField}`}
            aria-hidden
          >
            <div className={REQUEST_A4_WRAP}>
              <SupplierRequestSheet
                lines={draftLines}
                supplierName=""
                contractNumberLabel={contractNumberLabel}
                contractDateLabel={contractDateLabel}
                executorTitle={executorTitle}
                attributeColumns={lineSpecificationAttributeColumns('DOORS')}
                preview
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groups = groupDoorsSpecificationLinesBySupplier(savedLines);
  const hasPositions = groups.length > 0;
  /** Правка доступна и для пустой отредактированной заявки — чтобы вернуть позиции. */
  const canEdit = hasPositions || requestLines !== null;
  const activeGroup =
    groups.find((g) => g.key === activeGroupKey) ?? (groups.length > 0 ? groups[0] : null);

  return (
    <div>
      <div className={cdProduct.supplierRequestToolbar}>
        <button
          data-admin-mutation
          type="button"
          className={cdWorkspace.secondaryBtn}
          onClick={startEditing}
          disabled={!canEdit}
          title={
            canEdit
              ? 'Правки заявки не меняют Спецификацию — изменения оформляются доп. соглашением'
              : 'Заявка формируется из вкладки «Спецификация» — заполните позиции спецификации'
          }
        >
          Отредактировать заявку
        </button>
        {activeGroup ? (
          <button
            type="button"
            className={cdProduct.supplierRequestWordBtn}
            onClick={() =>
              downloadSupplierRequest({
                group: activeGroup,
                contractNumberLabel,
                contractDateLabel,
                executorTitle,
              })
            }
          >
            {activeGroup.supplierName
              ? `Скачать Word — ${activeGroup.supplierName}`
              : 'Скачать Word'}
          </button>
        ) : null}
        {saveNotice ? (
          <span className={cdProduct.supplierRequestToolbarNotice}>
            <SaveNoticeBlock notice={saveNotice} onOpenAddendum={onOpenAddendum} />
          </span>
        ) : null}
      </div>

      {!hasPositions ? (
        <article className={cdDocPreview.estimateA4Sheet}>
          <p className={cdDocPreview.estimateA4Empty}>
            {requestLines !== null
              ? 'Все позиции удалены из заявки — нажмите «Отредактировать заявку», чтобы вернуть их.'
              : 'Заявка формируется автоматически из вкладки «Спецификация» — заполните позиции спецификации.'}
          </p>
        </article>
      ) : (
        <>
          {requestLines !== null ? (
            <p className={cdDocPreview.hint} style={{ marginTop: 0 }}>
              Заявка отредактирована и может отличаться от Спецификации
              {linkedAddendumOrdinal !== null
                ? ` — изменения оформлены в Д/с №${linkedAddendumOrdinal}`
                : ''}
              . Спецификация договора остаётся неизменной.
            </p>
          ) : null}
          {groups.length > 1 ? (
            <div className={cdChrome.tabBar} style={{ marginBottom: 12 }}>
              {groups.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className={`${cdChrome.tab} ${
                    activeGroup?.key === group.key ? cdChrome.tabActive : ''
                  }`}
                  onClick={() => setActiveGroupKey(group.key)}
                >
                  {group.supplierName || 'Без поставщика'}
                </button>
              ))}
            </div>
          ) : null}
          {activeGroup ? (
            <SupplierRequestSheet
              lines={activeGroup.lines}
              supplierName={activeGroup.supplierName}
              contractNumberLabel={contractNumberLabel}
              contractDateLabel={contractDateLabel}
              executorTitle={executorTitle}
              attributeColumns={lineSpecificationAttributeColumns('DOORS')}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function SaveNoticeBlock({
  notice,
  onOpenAddendum,
}: {
  notice: SaveNotice;
  onOpenAddendum: (ordinal: number) => void;
}) {
  if (notice.kind === 'addendum') {
    return (
      <p className={cdDocPreview.hint} style={{ margin: 0 }}>
        Заявка сохранена. Изменения позиций оформлены в{' '}
        <button
          type="button"
          className={cdDataTab.packageAddendumUnsignedBannerLink}
          onClick={() => onOpenAddendum(notice.ordinal)}
        >
          Д/с №{notice.ordinal}
        </button>
        .
      </p>
    );
  }
  if (notice.kind === 'exhausted') {
    return (
      <p className={cdDocPreview.hint} style={{ margin: 0 }}>
        Заявка сохранена, но доп. соглашение не создано: все пять Д/с уже заняты.
      </p>
    );
  }
  return (
    <p className={cdDocPreview.hint} style={{ margin: 0 }}>
      Заявка сохранена — изменений относительно Спецификации нет.
    </p>
  );
}

function SupplierRequestSheet({
  lines,
  supplierName,
  contractNumberLabel,
  contractDateLabel,
  executorTitle,
  attributeColumns,
  preview = false,
}: {
  lines: DoorsSpecificationLine[];
  supplierName: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  executorTitle: string;
  attributeColumns: ReturnType<typeof lineSpecificationAttributeColumns>;
  preview?: boolean;
}) {
  return (
    <article
      className={cdDocPreview.estimateA4Sheet}
      data-print-target="final-estimate-sheet"
      data-page-orientation="portrait"
    >
      <p className={cdDocPreview.estimateA4AppendixRef}>
        Заявка № {contractNumberLabel} от {contractDateLabel}
      </p>
      <h4 className={cdDocPreview.estimateA4Title}>
        {preview ? 'Заявка поставщику (предпросмотр правок)' : 'Заявка поставщику'}
      </h4>
      {supplierName ? (
        <p className={cdDocPreview.hint}>
          Поставщик: <strong>{supplierName}</strong>
        </p>
      ) : null}
      <p className={cdDocPreview.hint}>
        От кого: <strong>{executorTitle.trim() || '—'}</strong>
      </p>
      <table
        className={`${cdDocPreview.doorsSpecificationA4Table} ${cdDocPreview.supplierRequestA4Table} doorsSpecificationA4Table`}
        data-spec-layout="doors"
      >
        <thead>
          <tr>
            <th>№</th>
            {attributeColumns.map((col) => (
              <th key={col.id}>{col.label}</th>
            ))}
            <th>Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id}>
              <td>{index + 1}</td>
              {attributeColumns.map((col) => (
                <td key={col.id}>{lineSpecificationAttributeValue(line, col.id).trim() || '—'}</td>
              ))}
              <td>{line.quantity.trim() || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
