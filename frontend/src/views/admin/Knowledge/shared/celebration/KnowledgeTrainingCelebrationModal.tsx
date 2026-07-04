'use client';

import Link from 'next/link';

import type { KnowledgeTrainingCelebration } from '@/shared/api/admin-knowledge';
import { Modal } from '@/shared/ui/Modal';

import styles from './KnowledgeTrainingCelebrationModal.module.css';
import {
  buildKnowledgeCelebrationCopy,
  getKnowledgeCelebrationLevelLabel,
} from './knowledge-celebration-messages';

type KnowledgeTrainingCelebrationModalProps = {
  celebration: KnowledgeTrainingCelebration | null;
  onClose: () => void;
  nextMaterialHref?: string | null;
  nextMaterialTitle?: string | null;
  backHref?: string;
};

export function KnowledgeTrainingCelebrationModal({
  celebration,
  onClose,
  nextMaterialHref,
  nextMaterialTitle,
  backHref,
}: KnowledgeTrainingCelebrationModalProps) {
  if (!celebration) {
    return null;
  }

  const copy = buildKnowledgeCelebrationCopy(celebration);
  const levelLabel = getKnowledgeCelebrationLevelLabel(celebration.level);
  const isCategory = celebration.level === 'category';
  const isModule = celebration.level === 'module';

  return (
    <Modal
      isOpen
      onClose={onClose}
      showCloseButton={false}
      size="md"
      className={`${styles.panel} ${isCategory ? styles.panelCategory : ''} ${isModule ? styles.panelModule : ''}`}
      contentClassName={styles.content}
    >
      {isCategory ? <div className={styles.confetti} aria-hidden /> : null}

      <div className={styles.iconWrap} aria-hidden>
        <span className={styles.icon}>{isCategory ? '🏆' : isModule ? '🎓' : '✓'}</span>
      </div>

      <p className={styles.levelTag}>{levelLabel}</p>
      <h2 className={styles.headline}>{copy.headline}</h2>
      <p className={styles.body}>{copy.body}</p>

      {celebration.level === 'material' && celebration.categoryProgress.total > 0 ? (
        <p className={styles.progressHint}>
          Прогресс в категории «{celebration.categoryName}»:{' '}
          {celebration.categoryProgress.completed} из {celebration.categoryProgress.total}
        </p>
      ) : null}

      <div className={styles.actions}>
        {nextMaterialHref ? (
          <Link href={nextMaterialHref} className={styles.primaryBtn} onClick={onClose}>
            Следующий материал →
          </Link>
        ) : null}
        {backHref ? (
          <Link
            href={backHref}
            className={nextMaterialHref ? styles.secondaryBtn : styles.primaryBtn}
            onClick={onClose}
          >
            {nextMaterialHref ? 'К списку материалов' : 'Продолжить обучение'}
          </Link>
        ) : (
          <button type="button" className={styles.primaryBtn} onClick={onClose}>
            Продолжить
          </button>
        )}
      </div>

      {nextMaterialHref && nextMaterialTitle ? (
        <p className={styles.nextHint}>Далее: {nextMaterialTitle}</p>
      ) : null}
    </Modal>
  );
}
