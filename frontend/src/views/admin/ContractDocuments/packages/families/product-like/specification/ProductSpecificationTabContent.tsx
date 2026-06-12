'use client';

import { useCallback, useRef, useState } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';
import { uploadWindowsSpecificationFile } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdHubModals from '../../../../styles/hub-modals.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../../platform/editor/shared/packageLockNoticeUi';
import { productSpecificationCopy } from './productSpecificationCopy';

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

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

type ProductSpecificationTabContentProps = {
  packageKind: ContractDocumentPackageKind;
  packageId: string;
  amount: string;
  fileUrl: string;
  fileName: string;
  contractNumberLabel: string;
  contractDateLabel: string;
  disabled?: boolean;
  onAmountChange: (value: string) => void;
  onFileAttached: (payload: { fileUrl: string; fileName: string }) => void;
  onFileClear: () => void;
  onError?: (message: string) => void;
};

export function ProductSpecificationTabContent({
  packageKind,
  packageId,
  amount,
  fileUrl,
  fileName,
  contractNumberLabel,
  contractDateLabel,
  disabled = false,
  onAmountChange,
  onFileAttached,
  onFileClear,
  onError,
}: ProductSpecificationTabContentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastFileSize, setLastFileSize] = useState<number | null>(null);

  const handleFilePick = useCallback(
    async (file: File | null) => {
      if (!file || disabled) return;
      setUploading(true);
      try {
        const res = await uploadWindowsSpecificationFile(packageId, file);
        onFileAttached({ fileUrl: res.fileUrl, fileName: res.fileName });
        setLastFileSize(res.size);
      } catch (e) {
        onError?.(e instanceof Error ? e.message : 'Не удалось загрузить файл');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [disabled, onError, onFileAttached, packageId]
  );

  const downloadHref = fileUrl.trim() ? publicUploadUrl(fileUrl) : '';
  const copy = isProductDirectionPackageKind(packageKind)
    ? productSpecificationCopy(packageKind)
    : productSpecificationCopy('WINDOWS');

  return (
    <div className={SPEC_ROOT}>
      <div className={SPEC_FORM_GRID}>
        <div className={SPEC_SECTION_CARD}>
          {disabled ? (
            <PackageLockNotice>{packageLockNoticeMessage('specification')}</PackageLockNotice>
          ) : null}
          <h3 className={`${SPEC_SECTION_TITLE} ${SPEC_SECTION_TITLE_MAIN}`}>Спецификация</h3>
          <p className={SPEC_HINT} style={{ marginTop: 0 }}>
            Спецификация ПВХ-изделий готовится в отдельной программе. Укажите итоговую стоимость и
            прикрепите файл с эскизом и расчётом (PDF, Office, изображения, архивы, DWG и др.).
          </p>
          <div className={SPEC_SECTION_FIELDS}>
            <div className={`${cdHubModals.windowsSpecMainRow} ${cdEstimateTab.fieldSpanAll}`}>
              <div className={`${SPEC_FIELD} ${cdHubModals.windowsSpecAmountField}`}>
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
                    disabled={disabled || uploading}
                    onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="windows-specification-file"
                    className={`${cdWorkspace.secondaryBtn} ${cdHubModals.windowsSpecFilePickBtn}`}
                    data-disabled={disabled || uploading ? '' : undefined}
                  >
                    {uploading ? 'Загрузка…' : fileUrl.trim() ? 'Заменить файл' : 'Выбрать файл'}
                  </label>
                  {!fileUrl.trim() ? (
                    <p
                      className={`${cdHubModals.windowsSpecFileHint} ${cdProduct.windowsSpecFileHint}`}
                    >
                      Допустимы распространённые форматы документов, чертежей и изображений (до 50
                      МБ). Исполняемые файлы (.exe, .bat и т.п.) загружать нельзя.
                    </p>
                  ) : null}
                  {fileUrl.trim() ? (
                    <button
                      type="button"
                      className={`${cdWorkspace.secondaryBtn} ${cdHubModals.windowsSpecFileRemoveBtn}`}
                      disabled={disabled || uploading}
                      onClick={() => {
                        onFileClear();
                        setLastFileSize(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Удалить
                    </button>
                  ) : null}
                </div>
                {fileUrl.trim() ? (
                  <p
                    className={`${cdHubModals.windowsSpecFileMeta} ${cdProduct.windowsSpecFileMeta}`}
                  >
                    <a
                      className={cdHub.link}
                      href={downloadHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={fileName.trim() || undefined}
                    >
                      {fileName.trim() || 'Скачать файл'}
                    </a>
                    {lastFileSize != null ? ` · ${formatFileSize(lastFileSize)}` : null}
                  </p>
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
              {fileName.trim() ? (
                <p className={cdDocPreview.estimateA4Meta}>
                  Файл: <strong>{fileName.trim()}</strong>
                </p>
              ) : (
                <p className={cdDocPreview.estimateA4Empty}>Файл не прикреплён.</p>
              )}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
