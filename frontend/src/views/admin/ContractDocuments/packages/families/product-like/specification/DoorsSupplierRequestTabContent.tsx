'use client';

import { useState } from 'react';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
  lineSpecificationAttributeColumns,
  lineSpecificationAttributeValue,
} from './doorsSpecification';

type DoorsSupplierRequestTabContentProps = {
  packageKind: 'DOORS';
  lines: DoorsSpecificationLine[];
  contractNumberLabel: string;
  contractDateLabel: string;
  executorTitle: string;
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
export function groupDoorsSpecificationLinesBySupplier(
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

/** Вкладка «Заявка» пакета «Двери»: автоформируется из строк Спецификации — по подвкладке на поставщика. */
export function DoorsSupplierRequestTabContent({
  lines,
  contractNumberLabel,
  contractDateLabel,
  executorTitle,
}: DoorsSupplierRequestTabContentProps) {
  const groups = groupDoorsSpecificationLinesBySupplier(lines);
  const hasPositions = groups.length > 0;
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);
  const activeGroup =
    groups.find((g) => g.key === activeGroupKey) ?? (hasPositions ? groups[0] : null);
  const attributeColumns = lineSpecificationAttributeColumns('DOORS');

  return (
    <div>
      {!hasPositions ? (
        <article className={cdDocPreview.estimateA4Sheet}>
          <p className={cdDocPreview.estimateA4Empty}>
            Заявка формируется автоматически из вкладки «Спецификация» — заполните позиции
            спецификации.
          </p>
        </article>
      ) : (
        <>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                type="button"
                style={{
                  padding: '6px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
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
            </div>
          ) : null}
          {activeGroup ? (
            <SupplierRequestSheet
              lines={activeGroup.lines}
              supplierName={activeGroup.supplierName}
              contractNumberLabel={contractNumberLabel}
              contractDateLabel={contractDateLabel}
              executorTitle={executorTitle}
              attributeColumns={attributeColumns}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function SupplierRequestSheet({
  lines,
  supplierName,
  contractNumberLabel,
  contractDateLabel,
  executorTitle,
  attributeColumns,
}: {
  lines: DoorsSpecificationLine[];
  supplierName: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  executorTitle: string;
  attributeColumns: ReturnType<typeof lineSpecificationAttributeColumns>;
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
      <h4 className={cdDocPreview.estimateA4Title}>Заявка поставщику</h4>
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
