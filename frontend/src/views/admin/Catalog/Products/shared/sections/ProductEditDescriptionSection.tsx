'use client';

import { isRichTextEmpty, toRichTextEditorHtml } from '@/shared/lib/sanitize';
import { BlogPostEditor } from '@/views/admin/Content/Blog/shared/BlogPostEditor';

import styles from '../ProductEditPage.module.css';

type ProductEditDescriptionSectionProps = {
  description: string;
  onDescriptionChange: (value: string) => void;
  /** Remount editor when product loads / switches. */
  editorKey?: string;
};

export function ProductEditDescriptionSection({
  description,
  onDescriptionChange,
  editorKey,
}: ProductEditDescriptionSectionProps) {
  return (
    <div className={`${styles.formSection} ${styles.formSectionFullWidth}`}>
      <h2 className={styles.sectionTitle}>Описание</h2>

      <div className={styles.formGroup}>
        <BlogPostEditor
          key={editorKey || 'product-description'}
          value={toRichTextEditorHtml(description)}
          onChange={(html) => {
            onDescriptionChange(isRichTextEmpty(html) ? '' : html);
          }}
          compact
          enableTextAlign={false}
          placeholder="Подробное описание товара..."
        />
      </div>
    </div>
  );
}
