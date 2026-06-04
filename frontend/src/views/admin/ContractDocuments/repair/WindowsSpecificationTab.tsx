'use client';

import { useCallback, useRef, useState } from 'react';

import { uploadWindowsSpecificationFile } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import styles from '../ContractDocuments.module.css';

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

type WindowsSpecificationTabProps = {
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

export function WindowsSpecificationTab({
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
}: WindowsSpecificationTabProps) {
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

  return (
    <div
      className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact} ${styles.windowsContractTabTypography}`}
    >
      <div className={styles.formGrid}>
        <div className={styles.sectionCard}>
          <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>Спецификация</h3>
          <p className={styles.hint} style={{ marginTop: 0 }}>
            Спецификация ПВХ-изделий готовится в отдельной программе. Укажите итоговую стоимость и
            прикрепите файл с эскизом и расчётом (PDF, Office, изображения, архивы, DWG и др.).
          </p>
          <div className={styles.sectionFields}>
            <div className={`${styles.windowsSpecMainRow} ${styles.fieldSpanAll}`}>
              <div className={`${styles.field} ${styles.windowsSpecAmountField}`}>
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
              <div className={`${styles.field} ${styles.windowsSpecFileField}`}>
                <span
                  className={styles.windowsSpecFieldCaption}
                  id="windows-specification-file-caption"
                >
                  Файл спецификации
                </span>
                <div
                  className={styles.windowsSpecFileControlRow}
                  aria-labelledby="windows-specification-file-caption"
                >
                  <input
                    ref={fileInputRef}
                    id="windows-specification-file"
                    type="file"
                    className={styles.repairWorkStartModalFileInputSrOnly}
                    disabled={disabled || uploading}
                    onChange={(e) => void handleFilePick(e.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="windows-specification-file"
                    className={`${styles.secondaryBtn} ${styles.windowsSpecFilePickBtn}`}
                    data-disabled={disabled || uploading ? '' : undefined}
                  >
                    {uploading ? 'Загрузка…' : fileUrl.trim() ? 'Заменить файл' : 'Выбрать файл'}
                  </label>
                  {!fileUrl.trim() ? (
                    <p className={styles.windowsSpecFileHint}>
                      Допустимы распространённые форматы документов, чертежей и изображений (до 50
                      МБ). Исполняемые файлы (.exe, .bat и т.п.) загружать нельзя.
                    </p>
                  ) : null}
                  {fileUrl.trim() ? (
                    <button
                      type="button"
                      className={`${styles.secondaryBtn} ${styles.windowsSpecFileRemoveBtn}`}
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
                  <p className={styles.windowsSpecFileMeta}>
                    <a
                      className={styles.link}
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
          className={`${styles.field} ${styles.fieldSpanAll} ${styles.estimateSheetField}`}
          aria-hidden
        >
          <div className={styles.estimateA4Wrap}>
            <article className={styles.estimateA4Sheet} data-print-target="final-estimate-sheet">
              <p className={styles.estimateA4AppendixRef}>
                Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
              </p>
              <h4 className={styles.estimateA4Title}>Спецификация</h4>
              {amount.trim() ? (
                <p className={styles.estimateA4Total}>
                  Стоимость спецификации: <strong>{amount.trim()} руб.</strong>
                </p>
              ) : (
                <p className={styles.estimateA4Empty}>Стоимость не указана.</p>
              )}
              {fileName.trim() ? (
                <p className={styles.estimateA4Meta}>
                  Файл: <strong>{fileName.trim()}</strong>
                </p>
              ) : (
                <p className={styles.estimateA4Empty}>Файл не прикреплён.</p>
              )}
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
