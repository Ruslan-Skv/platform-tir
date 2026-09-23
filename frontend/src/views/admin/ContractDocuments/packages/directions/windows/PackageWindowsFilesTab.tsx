'use client';

import { ArrowDownTrayIcon, ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/outline';

import { useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { uploadWindowsAdditionalFile } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import cdHub from '../../../styles/contracts-list-hub.module.css';
import cdDataTab from '../../../styles/data-tab.module.css';
import cdDocPreview from '../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdHubModals from '../../../styles/hub-modals.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import {
  formatPackageFileDate,
  formatPackageFileSize,
} from '../../platform/editor/shared/packageFileMeta';
import { PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX } from '../../platform/form/normalize';
import type { PackageFormData } from '../../platform/form/packageForm';

const FILES_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact} ${cdHubModals.estimateTabCompact}`;
const FILES_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
const FILES_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact} ${cdHubModals.dataCompact}`;
const FILES_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
const FILES_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const FILES_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
const FILES_SECTION_TITLE = cdEstimateTab.sectionTitle;
const FILES_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const FILES_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const FILES_FIELD = `${cdHubModals.field} ${cdDataTab.field} ${cdEstimateTab.field}`;
const FILES_ROOT = `${FILES_BLOCK} ${FILES_DATA_COMPACT} ${FILES_TAB_COMPACT} ${cdProduct.windowsContractTabTypography}`;

export type PackageWindowsFilesTabProps = {
  packageId: string;
  form: PackageFormData;
  setForm: Dispatch<SetStateAction<PackageFormData>>;
  touchPackageData: () => void;
};

/**
 * Вкладка «Файлы» пакета «Окна»: коммерческое предложение и другие исходники
 * в произвольных форматах. Файлы хранятся в исходном виде, просмотр содержимого
 * не выполняется — только скачивание.
 */
export function PackageWindowsFilesTab({
  packageId,
  form,
  setForm,
  touchPackageData,
}: PackageWindowsFilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const files = form.windowsAdditionalFiles ?? [];
  const maxReached = files.length >= PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX;

  const handleFilesPicked = async (picked: FileList | null) => {
    if (!picked || picked.length === 0 || uploading) return;
    setUploadError(null);
    setUploading(true);
    let remaining = PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX - files.length;
    try {
      for (const file of Array.from(picked)) {
        if (remaining <= 0) {
          setUploadError(
            `Можно прикрепить не более ${PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX} файлов — лишние пропущены.`
          );
          break;
        }
        try {
          const res = await uploadWindowsAdditionalFile(packageId, file);
          setForm((prev) => ({
            ...prev,
            windowsAdditionalFiles: [
              ...(prev.windowsAdditionalFiles ?? []),
              {
                fileUrl: res.fileUrl,
                fileName: res.fileName,
                uploadedAt: new Date().toISOString(),
                size: res.size,
              },
            ],
          }));
          touchPackageData();
          remaining -= 1;
        } catch (e) {
          setUploadError(e instanceof Error ? e.message : 'Не удалось загрузить файл');
          break;
        }
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (fileUrl: string) => {
    if (uploading) return;
    setUploadError(null);
    setForm((prev) => ({
      ...prev,
      windowsAdditionalFiles: (prev.windowsAdditionalFiles ?? []).filter(
        (f) => f.fileUrl !== fileUrl
      ),
    }));
    touchPackageData();
  };

  return (
    <div className={FILES_ROOT}>
      <div className={FILES_FORM_GRID}>
        <div className={`${FILES_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
          <h3 className={`${FILES_SECTION_TITLE} ${FILES_SECTION_TITLE_MAIN}`}>Файлы</h3>
          <p className={FILES_HINT} style={{ marginTop: 0 }}>
            Прикрепите коммерческое предложение и другие файлы по договору (jpg, rtf, pdf, Office,
            архивы, DWG и др. — до 50 МБ). Файлы хранятся в исходном виде, просмотр содержимого не
            выполняется — скачивайте файл по иконке. Исполняемые файлы (.exe, .bat и т.п.) загружать
            нельзя.
          </p>
          <div className={FILES_SECTION_FIELDS}>
            <div className={`${FILES_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
              <span
                className={`${cdHubModals.windowsSpecFieldCaption} ${cdProduct.windowsSpecFieldCaption}`}
                id="windows-files-caption"
              >
                Прикреплённые файлы
              </span>
              <div
                className={cdHubModals.windowsSpecFileControlRow}
                aria-labelledby="windows-files-caption"
              >
                <input
                  ref={fileInputRef}
                  id="windows-additional-file"
                  type="file"
                  multiple
                  className={cdHubModals.packageWorkStartModalFileInputSrOnly}
                  disabled={uploading || maxReached}
                  onChange={(e) => void handleFilesPicked(e.target.files)}
                />
                <label
                  htmlFor="windows-additional-file"
                  className={`${cdWorkspace.secondaryBtn} ${cdHubModals.windowsSpecFilePickBtn}`}
                  data-disabled={uploading || maxReached ? '' : undefined}
                >
                  <ArrowUpTrayIcon aria-hidden />
                  {uploading ? 'Загрузка…' : 'Загрузить файл'}
                </label>
                {files.length ? (
                  <span
                    className={`${cdHubModals.windowsSpecFileMeta} ${cdProduct.windowsSpecFileMeta}`}
                  >
                    Загружено файлов: {files.length} из {PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX}.
                  </span>
                ) : null}
              </div>
              {uploadError ? (
                <p
                  className={`${cdHubModals.windowsSpecFileMeta} ${cdProduct.windowsSpecFileMeta}`}
                  role="alert"
                >
                  {uploadError}
                </p>
              ) : null}
              {!files.length && !uploading ? (
                <p
                  className={`${cdHubModals.windowsSpecFileMeta} ${cdProduct.windowsSpecFileMeta}`}
                >
                  Файлы ещё не прикреплены.
                </p>
              ) : null}
              {files.length ? (
                <div>
                  {files.map((entry) => (
                    <p
                      key={entry.fileUrl}
                      className={`${cdProduct.windowsSpecVersionRow} ${cdProduct.windowsSpecFileMeta}`}
                    >
                      <a
                        className={cdHub.link}
                        href={publicUploadUrl(entry.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {entry.fileName || 'Файл'}
                      </a>
                      {entry.size != null ? ` · ${formatPackageFileSize(entry.size)}` : ''}
                      {entry.uploadedAt
                        ? ` · загружен ${formatPackageFileDate(entry.uploadedAt)}`
                        : ''}
                      <a
                        className={cdProduct.windowsSpecVersionAction}
                        href={publicUploadUrl(entry.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={entry.fileName || undefined}
                        title="Скачать файл"
                        aria-label={`Скачать файл ${entry.fileName || ''}`}
                      >
                        <ArrowDownTrayIcon aria-hidden />
                      </a>
                      <button
                        data-admin-mutation
                        type="button"
                        className={`${cdProduct.windowsSpecVersionAction} ${cdProduct.windowsSpecVersionActionRemove}`}
                        disabled={uploading}
                        onClick={() => removeFile(entry.fileUrl)}
                        title="Удалить файл"
                        aria-label={`Удалить файл ${entry.fileName || ''}`}
                      >
                        <TrashIcon aria-hidden />
                      </button>
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
