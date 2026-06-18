'use client';

import Link from 'next/link';

import { BLANK_SECTIONS } from '../shared/recruitment.constants';
import styles from './RecruitmentBlankPage.module.css';

export function RecruitmentBlankPage() {
  return (
    <div className={styles.blankPage}>
      <div className={styles.noPrint}>
        <Link href="/admin/recruitment" className={styles.backLink}>
          ← К списку кандидатов
        </Link>
        <button type="button" className={styles.printBtn} onClick={() => window.print()}>
          Распечатать бланк
        </button>
      </div>

      <div className={styles.document}>
        <h1 className={styles.docTitle}>АНКЕТА КАНДИДАТА</h1>
        <p className={styles.docSubtitle}>на должность менеджера по продажам</p>

        {BLANK_SECTIONS.map((section, index) => (
          <div
            key={section.title}
            className={`${styles.section} ${
              index === 0 ? styles.sectionCompactGrid : index === 3 ? styles.sectionSkillsGrid : ''
            }`}
          >
            <h2 className={styles.sectionTitle}>{section.title}</h2>
            {section.fields.map((field) => (
              <div key={field.label} className={styles.field}>
                <div className={styles.fieldLabel}>{field.label}</div>
                {Array.from({ length: field.lines }).map((_, i) => (
                  <div
                    key={i}
                    className={field.lines > 1 ? styles.fieldLineTall : styles.fieldLine}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}

        <div className={styles.signature}>
          <div className={styles.signatureBlock}>
            <div>Дата заполнения</div>
            <div className={styles.signatureLine} />
          </div>
          <div className={styles.signatureBlock}>
            <div>Подпись кандидата</div>
            <div className={styles.signatureLine} />
          </div>
        </div>
      </div>
    </div>
  );
}
