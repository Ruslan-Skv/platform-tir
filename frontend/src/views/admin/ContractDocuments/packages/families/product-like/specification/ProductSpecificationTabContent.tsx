'use client';

import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { uploadWindowsSpecificationFile } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { sanitizeHtml } from '@/shared/lib/sanitize';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdHubModals from '../../../../styles/hub-modals.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { PackageEstimateSignaturesBlock } from '../../../platform/editor/estimateTab/estimateTabUi';
import {
  formatPackageFileSize as formatFileSize,
  formatPackageFileDate as formatVersionDate,
} from '../../../platform/editor/shared/packageFileMeta';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../../platform/editor/shared/packageLockNoticeUi';
import { PACKAGE_SPECIFICATION_VERSIONS_MAX } from '../../../platform/form/normalize';
import type { ProductSpecificationFileVersion } from '../../../platform/form/types';
import { productSpecificationCopy } from './productSpecificationCopy';
import { convertRtfSpecificationToPdf } from './rtfFileToPdf';
import { rtfToHtml } from './rtfToHtml';

const SPEC_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact} ${cdHubModals.estimateTabCompact}`;
const SPEC_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
const SPEC_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact} ${cdHubModals.dataCompact}`;
const SPEC_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
const SPEC_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const SPEC_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
const SPEC_SECTION_TITLE = cdEstimateTab.sectionTitle;
const SPEC_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const SPEC_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const SPEC_FIELD = `${cdHubModals.field} ${cdDataTab.field} ${cdEstimateTab.field}`;
const SPEC_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;
const SPEC_ROOT = `${SPEC_BLOCK} ${SPEC_DATA_COMPACT} ${SPEC_TAB_COMPACT} ${cdProduct.windowsContractTabTypography}`;

const IMAGE_FILE_EXT_RE = /\.(png|jpe?g|gif|webp|bmp|svg)$/i;
const PDF_FILE_EXT_RE = /\.pdf$/i;
const RTF_FILE_EXT_RE = /\.rtf$/i;

/**
 * Автоконвертация RTF → PDF при загрузке отключена: файлы спецификации прикрепляются
 * в исходном виде (RTF предпросматривается через rtfToHtml). Код конвертера сохранён —
 * чтобы вернуть преобразование, выставьте `true`.
 */
const CONVERT_RTF_SPECIFICATION_TO_PDF = false;

function isPdfSpecificationFile(url: string, name: string): boolean {
  return PDF_FILE_EXT_RE.test(url) || PDF_FILE_EXT_RE.test(name);
}

function isImageSpecificationFile(url: string, name: string): boolean {
  return IMAGE_FILE_EXT_RE.test(url) || IMAGE_FILE_EXT_RE.test(name);
}

function isRtfSpecificationFile(url: string, name: string): boolean {
  return RTF_FILE_EXT_RE.test(url) || RTF_FILE_EXT_RE.test(name);
}

type ProductSpecificationTabContentProps = {
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  amount: string;
  fileUrl: string;
  fileName: string;
  versions: ProductSpecificationFileVersion[];
  contractNumberLabel: string;
  contractDateLabel: string;
  directorName: string;
  customerFullName: string;
  disabled?: boolean;
  /** Договор подписан: сумма и просмотр заблокированы, но файл можно дополнить новой версией. */
  contractConcluded?: boolean;
  onAmountChange: (value: string) => void;
  onVersionAttached: (payload: { fileUrl: string; fileName: string; size: number | null }) => void;
  onVersionRemoved: (version: number) => void;
  onError?: (message: string) => void;
};

export function ProductSpecificationTabContent({
  packageKind,
  packageId,
  amount,
  fileUrl,
  fileName,
  versions,
  contractNumberLabel,
  contractDateLabel,
  directorName,
  customerFullName,
  disabled = false,
  contractConcluded = false,
  onAmountChange,
  onVersionAttached,
  onVersionRemoved,
  onError,
}: ProductSpecificationTabContentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rtfHtml, setRtfHtml] = useState<string | null>(null);
  const [rtfError, setRtfError] = useState<string | null>(null);

  /** После подписания договора сумма заблокирована, но загрузка новых версий файла доступна. */
  const versionsLocked = disabled && !contractConcluded;
  const canUploadMoreVersions =
    !versionsLocked && versions.length < PACKAGE_SPECIFICATION_VERSIONS_MAX;

  const handleFilePick = useCallback(
    async (file: File | null) => {
      if (!file || versionsLocked || !canUploadMoreVersions) return;
      setUploading(true);
      try {
        // Автоконвертация RTF → PDF выключена (CONVERT_RTF_SPECIFICATION_TO_PDF = false):
        // файл загружается в исходном виде.
        let uploadFile: File = file;
        if (CONVERT_RTF_SPECIFICATION_TO_PDF && /\.rtf$/i.test(file.name)) {
          const pdf = await convertRtfSpecificationToPdf(file, file.name);
          if (pdf) uploadFile = pdf;
        }
        const res = await uploadWindowsSpecificationFile(packageId, uploadFile);
        onVersionAttached({ fileUrl: res.fileUrl, fileName: res.fileName, size: res.size });
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Не удалось загрузить файл');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [canUploadMoreVersions, onError, onVersionAttached, packageId, versionsLocked]
  );

  const trimmedFileUrl = fileUrl.trim();
  const trimmedFileName = fileName.trim();
  const downloadHref = trimmedFileUrl ? publicUploadUrl(fileUrl) : '';
  const isPdfFile = trimmedFileUrl
    ? isPdfSpecificationFile(trimmedFileUrl, trimmedFileName)
    : false;
  const isImageFile = trimmedFileUrl
    ? isImageSpecificationFile(trimmedFileUrl, trimmedFileName)
    : false;
  const isRtfFile = trimmedFileUrl
    ? isRtfSpecificationFile(trimmedFileUrl, trimmedFileName)
    : false;

  useEffect(() => {
    setRtfHtml(null);
    setRtfError(null);
    if (!trimmedFileUrl || !isRtfFile) return;
    let aborted = false;
    void (async () => {
      try {
        const res = await fetch(publicUploadUrl(trimmedFileUrl));
        if (!res.ok) throw new Error('fetch failed');
        const text = await res.text();
        if (aborted) return;
        // RTF-конвертер пропускает внедрённый HTML (\*\htmltag) — санитизируем перед рендером
        const html = sanitizeHtml(rtfToHtml(text));
        setRtfHtml(html || null);
        if (!html) setRtfError('Не удалось прочитать содержимое RTF-файла.');
      } catch {
        if (!aborted) setRtfError('Не удалось загрузить файл для предпросмотра.');
      }
    })();
    return () => {
      aborted = true;
    };
  }, [trimmedFileUrl, isRtfFile]);
  const copy = isProductDirectionPackageKind(packageKind)
    ? productSpecificationCopy(packageKind)
    : productSpecificationCopy('WINDOWS');

  return (
    <div className={SPEC_ROOT}>
      <div className={SPEC_FORM_GRID}>
        <div className={`${SPEC_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
          {disabled ? (
            <PackageLockNotice>
              {packageLockNoticeMessage('specification', { versionsAllowed: contractConcluded })}
            </PackageLockNotice>
          ) : null}
          <h3 className={`${SPEC_SECTION_TITLE} ${SPEC_SECTION_TITLE_MAIN}`}>Спецификация</h3>
          <p className={SPEC_HINT} style={{ marginTop: 0 }}>
            Спецификация ПВХ-изделий готовится в отдельной программе. Укажите итоговую стоимость и
            прикрепите файл с эскизом и расчётом (PDF, RTF, Office, изображения, архивы, DWG и др.).
            RTF-файлы загружаются в исходном виде. После подписания договора обновлённый файл
            прикрепляйте новой версией — всего до 5 версий.
          </p>
          <p className={SPEC_HINT}>
            Печать спецификации не производите на платформе ТИР. Печать Спецификации производите из
            исходного файла.
          </p>
          <div className={SPEC_SECTION_FIELDS}>
            <div
              className={`${cdHubModals.windowsSpecMainRow} ${cdEstimateTab.fieldSpanAll} ${cdHubModals.windowsSpecWindowsTypography}`}
            >
              <div
                className={`${SPEC_FIELD} ${cdHubModals.windowsSpecAmountField} ${cdProduct.windowsSpecificationAmountField}`}
              >
                <label htmlFor="windows-specification-amount">Стоимость спецификации, руб.</label>
                <input
                  id="windows-specification-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  disabled={disabled}
                  placeholder="125 400,00"
                  onChange={(e) => onAmountChange(e.target.value)}
                />
              </div>
              <div className={`${SPEC_FIELD} ${cdHubModals.windowsSpecFileField}`}>
                <span
                  className={`${cdHubModals.windowsSpecFieldCaption} ${cdProduct.windowsSpecFieldCaption}`}
                  id="windows-specification-file-caption"
                >
                  Файл спецификации
                </span>
                <div
                  className={cdHubModals.windowsSpecFileControlRow}
                  aria-labelledby="windows-specification-file-caption"
                >
                  <input
                    ref={fileInputRef}
                    id="windows-specification-file"
                    type="file"
                    className={cdHubModals.packageWorkStartModalFileInputSrOnly}
                    disabled={!canUploadMoreVersions || uploading}
                    onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="windows-specification-file"
                    className={`${cdWorkspace.secondaryBtn} ${cdHubModals.windowsSpecFilePickBtn}`}
                    data-disabled={!canUploadMoreVersions || uploading ? '' : undefined}
                  >
                    {uploading
                      ? 'Загрузка…'
                      : versions.length
                        ? 'Загрузить новую версию'
                        : 'Выбрать файл'}
                  </label>
                  {!versions.length ? (
                    <p
                      className={`${cdHubModals.windowsSpecFileHint} ${cdProduct.windowsSpecFileHint}`}
                    >
                      Допустимы распространённые форматы документов, чертежей и изображений (до 50
                      МБ). Исполняемые файлы (.exe, .bat и т.п.) загружать нельзя.
                    </p>
                  ) : null}
                </div>
                {versions.length ? (
                  <div>
                    {versions.map((entry) => (
                      <p
                        key={entry.fileUrl}
                        className={`${cdProduct.windowsSpecVersionRow} ${cdProduct.windowsSpecFileMeta}`}
                      >
                        Версия №{entry.version}
                        {' · '}
                        <a
                          className={cdHub.link}
                          href={publicUploadUrl(entry.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={entry.fileName || undefined}
                        >
                          {entry.fileName || 'Скачать файл'}
                        </a>
                        {entry.size != null ? ` · ${formatFileSize(entry.size)}` : ''}
                        {entry.uploadedAt
                          ? ` · загружен ${formatVersionDate(entry.uploadedAt)}`
                          : ''}
                        <a
                          className={`${cdProduct.windowsSpecVersionAction} ${cdProduct.windowsSpecVersionActionDownload}`}
                          href={publicUploadUrl(entry.fileUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={entry.fileName || undefined}
                          title="Скачать файл"
                          aria-label={`Скачать файл версии №${entry.version}`}
                        >
                          <ArrowDownTrayIcon aria-hidden />
                        </a>
                        <button
                          data-admin-mutation
                          type="button"
                          className={`${cdProduct.windowsSpecVersionAction} ${cdProduct.windowsSpecVersionActionRemove}`}
                          disabled={versionsLocked || uploading}
                          onClick={() => onVersionRemoved(entry.version)}
                          title="Удалить версию"
                          aria-label={`Удалить версию №${entry.version}`}
                        >
                          <TrashIcon aria-hidden />
                        </button>
                      </p>
                    ))}
                    {canUploadMoreVersions ? (
                      <p
                        className={`${cdHubModals.windowsSpecFileMeta} ${cdProduct.windowsSpecFileMeta} ${cdProduct.windowsSpecVersionSummary}`}
                      >
                        Загружено версий: {versions.length} из {PACKAGE_SPECIFICATION_VERSIONS_MAX}.
                        Номер версии присваивается по порядку загрузки, предыдущие версии
                        сохраняются.
                      </p>
                    ) : (
                      <p
                        className={`${cdHubModals.windowsSpecFileMeta} ${cdProduct.windowsSpecFileMeta} ${cdProduct.windowsSpecVersionSummary}`}
                      >
                        Прикреплено максимальное число версий ({PACKAGE_SPECIFICATION_VERSIONS_MAX}
                        ). Чтобы добавить новую, удалите одну из предыдущих.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${SPEC_FIELD} ${cdEstimateTab.fieldSpanAll} ${cdProduct.estimateSheetField}`}
          aria-hidden
        >
          <div className={SPEC_A4_WRAP}>
            <article
              className={cdDocPreview.estimateA4Sheet}
              data-print-target="final-estimate-sheet"
            >
              <p className={cdDocPreview.estimateA4AppendixRef}>
                Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
              </p>
              <h4 className={cdDocPreview.estimateA4Title}>{copy.a4Title}</h4>
              {amount.trim() ? (
                <p className={cdDocPreview.estimateA4Total}>
                  Стоимость спецификации: <strong>{amount.trim()} руб.</strong>
                </p>
              ) : (
                <p className={cdDocPreview.estimateA4Empty}>Стоимость не указана.</p>
              )}
              {trimmedFileName ? (
                <p className={cdDocPreview.estimateA4Meta}>
                  Файл: <strong>{trimmedFileName}</strong>
                </p>
              ) : (
                <p className={cdDocPreview.estimateA4Empty}>Файл не прикреплён.</p>
              )}
              {trimmedFileUrl && isPdfFile ? (
                /* windowsSpecFilePreview* — стабильные глобальные классы для печати (printDocument.ts); module-классы — для экрана */
                <div
                  className={`${cdDocPreview.estimateA4FilePreview} windowsSpecFilePreview`}
                  aria-hidden
                >
                  <iframe
                    className={`${cdDocPreview.estimateA4FilePreviewFrame} windowsSpecFilePreviewFrame`}
                    src={downloadHref}
                    title={trimmedFileName || 'Файл спецификации'}
                  />
                </div>
              ) : trimmedFileUrl && isImageFile ? (
                <div
                  className={`${cdDocPreview.estimateA4FilePreview} windowsSpecFilePreview`}
                  aria-hidden
                >
                  <img
                    className={`${cdDocPreview.estimateA4FilePreviewImage} windowsSpecFilePreviewImage`}
                    src={downloadHref}
                    alt={trimmedFileName || 'Файл спецификации'}
                  />
                </div>
              ) : trimmedFileUrl && isRtfFile ? (
                /* windowsSpecRtfHolder/windowsSpecRtfContent — стабильные глобальные классы для печати (printDocument.ts); module-классы — для экрана */
                <div
                  className={`${cdDocPreview.estimateA4RtfPreview} windowsSpecRtfHolder`}
                  aria-hidden
                >
                  {rtfError ? (
                    <p className={cdDocPreview.estimateA4Empty}>{rtfError}</p>
                  ) : rtfHtml ? (
                    <div
                      className="windowsSpecRtfContent"
                      dangerouslySetInnerHTML={{ __html: rtfHtml }}
                    />
                  ) : (
                    <p className={cdDocPreview.estimateA4Empty}>Чтение файла…</p>
                  )}
                </div>
              ) : null}
              <PackageEstimateSignaturesBlock
                directorName={directorName}
                customerFullName={customerFullName}
                executorPartyLabel="Исполнитель"
              />
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
