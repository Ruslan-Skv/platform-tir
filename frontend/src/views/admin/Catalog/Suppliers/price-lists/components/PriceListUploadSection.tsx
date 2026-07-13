import { PRICE_LIST_UPLOAD_HINT } from '@/shared/api/admin-supplier-price-lists';

import styles from '../SupplierPriceListsPage.module.css';
import type { SupplierPriceListsPageModel } from '../supplier-price-lists-page.types';

type PriceListUploadSectionProps = Pick<
  SupplierPriceListsPageModel,
  | 'selectedFile'
  | 'fileInputRef'
  | 'uploading'
  | 'setSelectedFile'
  | 'clearSelectedFile'
  | 'handleUpload'
>;

export function PriceListUploadSection({
  selectedFile,
  fileInputRef,
  uploading,
  setSelectedFile,
  clearSelectedFile,
  handleUpload,
}: PriceListUploadSectionProps) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Загрузить прайс</h2>
      <div className={styles.uploadRow}>
        <div className={styles.filePicker}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            className={styles.fileInputHidden}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className={styles.filePickerButton}
            onClick={() => fileInputRef.current?.click()}
          >
            Выбрать файл
          </button>
          <div className={styles.filePickerMeta}>
            <span className={styles.filePickerName}>
              {selectedFile ? selectedFile.name : 'Файл не выбран'}
            </span>
            <span className={styles.filePickerHint}>{PRICE_LIST_UPLOAD_HINT}</span>
          </div>
          {selectedFile ? (
            <button type="button" className={styles.filePickerClear} onClick={clearSelectedFile}>
              Очистить
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={uploading || !selectedFile}
          onClick={() => void handleUpload()}
        >
          {uploading ? 'Загрузка…' : 'Загрузить все категории'}
        </button>
      </div>
    </section>
  );
}
