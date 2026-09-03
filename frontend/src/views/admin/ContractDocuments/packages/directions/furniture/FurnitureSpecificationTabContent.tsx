'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useCallback, useMemo, useRef, useState } from 'react';

import { uploadWindowsSpecificationFile } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdHubModals from '../../../styles/hub-modals.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import attachStyles from '../../platform/editor/estimateTab/PackageEstimateAttach.module.css';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../platform/editor/shared/packageLockNoticeUi';
import styles from './FurnitureSpecificationTabContent.module.css';
import type {
  FurnitureManufactureDocs,
  FurnitureMaterialLine,
  FurnitureSpecificationLine,
} from './furnitureManufactureDocs';
import {
  formatFurnitureMoney,
  formatFurnitureSpecificationLineTotal,
  furnitureSpecificationLinesTotal,
  newFurnitureMaterialLine,
  newFurnitureSpecificationLine,
  resolveFurnitureSpecificationLineTotal,
} from './furnitureManufactureDocs';

type Props = {
  packageId: string;
  docs: FurnitureManufactureDocs;
  contractNumberLabel: string;
  disabled?: boolean;
  onChange: (docs: FurnitureManufactureDocs) => void;
  onError: (message: string) => void;
};

function withSyncedTotal(line: FurnitureSpecificationLine): FurnitureSpecificationLine {
  return { ...line, lineTotal: formatFurnitureSpecificationLineTotal(line) };
}

function FileAttachBlock({
  label,
  fileUrl,
  fileName,
  disabled,
  uploading,
  onPick,
  onClear,
}: {
  label: string;
  fileUrl: string;
  fileName: string;
  disabled: boolean;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div className={styles.fileBlock}>
      <div className={styles.fileHeader}>
        <h4 className={styles.subTitle}>{label}</h4>
        {!disabled ? (
          <div className={styles.fileActions}>
            <button
              type="button"
              className={cdWorkspace.secondaryBtn}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Загрузка…' : fileUrl ? 'Заменить файл' : 'Прикрепить файл'}
            </button>
            {fileUrl ? (
              <button type="button" className={cdWorkspace.secondaryBtn} onClick={onClear}>
                Удалить
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) onPick(file);
        }}
      />
      {fileUrl ? (
        <p className={styles.fileMeta}>
          <a href={publicUploadUrl(fileUrl)} target="_blank" rel="noreferrer">
            {fileName || 'Файл'}
          </a>
        </p>
      ) : (
        <p className={styles.fileEmpty}>Файл не прикреплён</p>
      )}
    </div>
  );
}

export function FurnitureSpecificationTabContent({
  packageId,
  docs,
  contractNumberLabel,
  disabled = false,
  onChange,
  onError,
}: Props) {
  const [uploadingKind, setUploadingKind] = useState<'sketch' | 'measurement' | null>(null);

  const patchDocs = useCallback(
    (patch: Partial<FurnitureManufactureDocs>) => {
      onChange({ ...docs, ...patch });
    },
    [docs, onChange]
  );

  const setLines = useCallback(
    (lines: FurnitureSpecificationLine[]) => {
      patchDocs({ specificationLines: lines.map(withSyncedTotal) });
    },
    [patchDocs]
  );

  const setMaterials = useCallback(
    (materialsLines: FurnitureMaterialLine[]) => {
      patchDocs({ materialsLines });
    },
    [patchDocs]
  );

  const sectionTotal = useMemo(
    () => furnitureSpecificationLinesTotal(docs.specificationLines),
    [docs.specificationLines]
  );

  const uploadFile = async (kind: 'sketch' | 'measurement', file: File) => {
    if (disabled) return;
    setUploadingKind(kind);
    try {
      const res = await uploadWindowsSpecificationFile(packageId, file);
      if (kind === 'sketch') {
        patchDocs({ sketchFileUrl: res.fileUrl, sketchFileName: res.fileName || file.name });
      } else {
        patchDocs({
          measurementFileUrl: res.fileUrl,
          measurementFileName: res.fileName || file.name,
        });
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось загрузить файл');
    } finally {
      setUploadingKind(null);
    }
  };

  return (
    <div className={`${cdDataTab.blockData} ${cdProduct.blockData} ${styles.wrap}`}>
      {disabled ? (
        <PackageLockNotice>{packageLockNoticeMessage('specification')}</PackageLockNotice>
      ) : null}

      <section className={styles.section}>
        <h3 className={cdEstimateTab.sectionTitle}>
          Спецификация изготовления
          {contractNumberLabel ? ` · ${contractNumberLabel}` : ''}
        </h3>
        <p className={styles.hint}>
          Позиции мебели: наименование, цвет, габариты (Ш×В×Г), количество и цена. Итог учитывается
          в стоимости договора на изготовление.
        </p>
        <div className={cdProduct.windowsAddendumSpecTableWrap}>
          <table className={`${cdProduct.windowsAddendumSpecTable} ${styles.specTable}`}>
            <thead>
              <tr>
                <th>#</th>
                <th>Наименование</th>
                <th>Цвет</th>
                <th>Ширина</th>
                <th>Высота</th>
                <th>Глубина</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Сумма</th>
                {!disabled ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {docs.specificationLines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={line.name}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, name: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.color}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, color: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.width}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, width: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.height}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, height: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.depth}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, depth: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.quantity}
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, quantity: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.unitPrice}
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(e) => {
                        const next = [...docs.specificationLines];
                        next[index] = withSyncedTotal({ ...line, unitPrice: e.target.value });
                        setLines(next);
                      }}
                    />
                  </td>
                  <td className={styles.amountCell}>
                    {formatFurnitureMoney(resolveFurnitureSpecificationLineTotal(line))}
                  </td>
                  {!disabled ? (
                    <td>
                      <button
                        type="button"
                        className={cdWorkspace.secondaryBtn}
                        onClick={() =>
                          setLines(docs.specificationLines.filter((row) => row.id !== line.id))
                        }
                        disabled={docs.specificationLines.length <= 1}
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabled ? (
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn} ${cdProduct.windowsAddendumSpecAddBtn}`}
            onClick={() => setLines([...docs.specificationLines, newFurnitureSpecificationLine()])}
          >
            <PlusIcon className={cdProduct.windowsAddendumSpecAddBtnIcon} aria-hidden />
            Добавить позицию
          </button>
        ) : null}
        <p className={styles.total}>
          Итого по спецификации: {formatFurnitureMoney(sectionTotal)} руб.
        </p>
      </section>

      <section className={styles.section}>
        <FileAttachBlock
          label="Эскиз (приложение №2)"
          fileUrl={docs.sketchFileUrl}
          fileName={docs.sketchFileName}
          disabled={disabled}
          uploading={uploadingKind === 'sketch'}
          onPick={(file) => void uploadFile('sketch', file)}
          onClear={() => patchDocs({ sketchFileUrl: '', sketchFileName: '' })}
        />
        <FileAttachBlock
          label="Замер (приложение №3)"
          fileUrl={docs.measurementFileUrl}
          fileName={docs.measurementFileName}
          disabled={disabled}
          uploading={uploadingKind === 'measurement'}
          onPick={(file) => void uploadFile('measurement', file)}
          onClear={() => patchDocs({ measurementFileUrl: '', measurementFileName: '' })}
        />
      </section>

      <section className={styles.section}>
        <h3 className={cdEstimateTab.sectionTitle}>Таблица материалов</h3>
        <p className={styles.hint}>Внутренняя таблица для заказа материалов (Excel «Табл.»).</p>
        <div className={cdProduct.windowsAddendumSpecTableWrap}>
          <table className={`${cdProduct.windowsAddendumSpecTable} ${styles.specTable}`}>
            <thead>
              <tr>
                <th>#</th>
                <th>Наименование</th>
                <th>Артикул / цвет</th>
                <th>Ед.</th>
                <th>Кол-во</th>
                <th>Поставщик</th>
                <th>Пров.</th>
                <th>Заказ.</th>
                {!disabled ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {docs.materialsLines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={line.name}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, name: e.target.value };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.articleColor}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, articleColor: e.target.value };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.unit}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, unit: e.target.value };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.quantity}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, quantity: e.target.value };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.supplier}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, supplier: e.target.value };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  <td className={styles.checkCell}>
                    <input
                      type="checkbox"
                      checked={line.checked}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, checked: e.target.checked };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  <td className={styles.checkCell}>
                    <input
                      type="checkbox"
                      checked={line.ordered}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.materialsLines];
                        next[index] = { ...line, ordered: e.target.checked };
                        setMaterials(next);
                      }}
                    />
                  </td>
                  {!disabled ? (
                    <td>
                      <button
                        type="button"
                        className={cdWorkspace.secondaryBtn}
                        onClick={() =>
                          setMaterials(docs.materialsLines.filter((row) => row.id !== line.id))
                        }
                        disabled={docs.materialsLines.length <= 1}
                      >
                        ×
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!disabled ? (
          <button
            type="button"
            className={`${cdWorkspace.secondaryBtn} ${cdProduct.windowsAddendumSpecAddBtn}`}
            onClick={() => setMaterials([...docs.materialsLines, newFurnitureMaterialLine()])}
          >
            <PlusIcon className={cdProduct.windowsAddendumSpecAddBtnIcon} aria-hidden />
            Добавить материал
          </button>
        ) : null}
      </section>

      <div className={cdHubModals.field}>
        <label htmlFor="furniture_spec_discount">Скидка на спецификацию, %</label>
        <input
          id="furniture_spec_discount"
          value={docs.discountPercent}
          disabled={disabled}
          inputMode="decimal"
          onChange={(e) => patchDocs({ discountPercent: e.target.value })}
          placeholder="0"
        />
      </div>
    </div>
  );
}
