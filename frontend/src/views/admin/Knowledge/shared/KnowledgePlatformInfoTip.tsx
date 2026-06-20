'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformInfoTip.module.css';

const PLATFORM_STEPS = [
  'В разделе доступны только опубликованные материалы — их можно читать, смотреть и проходить тесты.',
  'Черновики и архив недоступны, даже по прямой ссылке.',
  'Можно закрепить материал в списке категории — он будет показываться первым.',
  'Можно отметить опубликованный материал как «интересный» — счётчик видят все.',
  'Под опубликованными материалами можно оставлять комментарии — их видят все обучающиеся.',
  'Статистика обучения доступна всем сотрудникам с доступом к разделу.',
] as const;

const STUDY_MEANING_ITEMS = [
  '«Изучить» — это не значит «выучить наизусть весь материал»: достаточно понять суть и запомнить главные моменты.',
  'Успешно пройти тесты по изученным темам.',
  'Научиться работать в обучающей платформе и при необходимости пользоваться ею.',
] as const;

const PLATFORM_HELP = {
  title: 'Правила обучающей платформы',
  note: 'Корпоративная обучающая платформа: статьи, видео, ссылки и тесты после материалов.',
  traineeLead:
    'Уважаемый стажёр, для повышения шансов на ваше трудоустройство в компании вам необходимо изучить не менее 30% материалов в каждой категории.',
} as const;

export function KnowledgePlatformInfoTip() {
  return (
    <AdminHelpTooltip
      title={PLATFORM_HELP.title}
      align="end"
      body={
        <div className={styles.body}>
          <p className={styles.note}>{PLATFORM_HELP.note}</p>
          <ol className={styles.steps}>
            {PLATFORM_STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <section className={styles.traineeSection}>
            <p className={styles.traineeLead}>{PLATFORM_HELP.traineeLead}</p>
            <p className={styles.meaningTitle}>Что означает «изучить»:</p>
            <ol className={styles.meaningList}>
              {STUDY_MEANING_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </section>
        </div>
      }
    >
      <button
        type="button"
        className={`${cdTemplates.formatBtn} ${styles.trigger}`}
        aria-label={PLATFORM_HELP.title}
      >
        <AdminHelpInfoIcon />
      </button>
    </AdminHelpTooltip>
  );
}
