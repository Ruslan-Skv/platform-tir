'use client';

import { ArrowUpTrayIcon, PlusIcon } from '@heroicons/react/24/outline';

import { useCallback, useMemo, useRef, useState } from 'react';

import { uploadWindowsSpecificationFile } from '@/shared/api/admin-contract-document-packages';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdHubModals from '../../../styles/hub-modals.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import { DetachEstimateIcon } from '../../platform/editor/shared/DetachEstimateIcon';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../platform/editor/shared/packageLockNoticeUi';
import {
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_FIELD,
  PACKAGE_TAB_FIELD_HINT,
  PACKAGE_TAB_FIELD_PERCENT,
  PACKAGE_TAB_HEAD,
  PACKAGE_TAB_HINT,
  PACKAGE_TAB_SUBTITLE,
  PACKAGE_TAB_TITLE,
} from '../../platform/ui/packageTabClassNames';
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
        <h4 className={PACKAGE_TAB_SUBTITLE}>{label}</h4>
        {!disabled ? (
          <div className={styles.fileActions}>
            <button
              type="button"
              className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <ArrowUpTrayIcon aria-hidden />
              {uploading ? 'Загрузка…' : fileUrl ? 'Заменить файл' : 'Прикрепить файл'}
            </button>
            {fileUrl ? (
              <button
                type="button"
                className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
                onClick={onClear}
              >
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
    <div
      className={`${cdDataTab.blockData} ${cdProduct.blockData} ${PACKAGE_TAB_CARD} ${styles.wrap}`}
    >
      <section className={styles.section}>
        <div className={PACKAGE_TAB_HEAD}>
          <h3 className={PACKAGE_TAB_TITLE}>
            Спецификация изготовления
            {contractNumberLabel ? ` · ${contractNumberLabel}` : ''}
          </h3>
          {disabled ? (
            <PackageLockNotice>{packageLockNoticeMessage('specification')}</PackageLockNotice>
          ) : null}
          <p className={PACKAGE_TAB_HINT}>
            Позиции мебели: наименование, цвет, габариты (Ш×В×Г), количество и цена. Итог
            учитывается в стоимости договора на изготовление.
          </p>
        </div>
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
                      <AdminTableIconButton
                        aria-label="Удалить строку"
                        title="Удалить"
                        onClick={() =>
                          setLines(docs.specificationLines.filter((row) => row.id !== line.id))
                        }
                        disabled={docs.specificationLines.length <= 1}
                      >
                        <DetachEstimateIcon />
                      </AdminTableIconButton>
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
            className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
            onClick={() => setLines([...docs.specificationLines, newFurnitureSpecificationLine()])}
          >
            <PlusIcon aria-hidden />
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
        <h3 className={PACKAGE_TAB_SUBTITLE}>Таблица материалов</h3>
        <p className={PACKAGE_TAB_FIELD_HINT}>
          Внутренняя таблица для заказа материалов (Excel «Табл.»).
        </p>
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
                      <AdminTableIconButton
                        aria-label="Удалить строку"
                        title="Удалить"
                        onClick={() =>
                          setMaterials(docs.materialsLines.filter((row) => row.id !== line.id))
                        }
                        disabled={docs.materialsLines.length <= 1}
                      >
                        <DetachEstimateIcon />
                      </AdminTableIconButton>
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
            className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
            onClick={() => setMaterials([...docs.materialsLines, newFurnitureMaterialLine()])}
          >
            <PlusIcon aria-hidden />
            Добавить материал
          </button>
        ) : null}
      </section>

      <div className={styles.section}>
        <div className={`${cdHubModals.field} ${PACKAGE_TAB_FIELD} ${PACKAGE_TAB_FIELD_PERCENT}`}>
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
    </div>
  );
}
