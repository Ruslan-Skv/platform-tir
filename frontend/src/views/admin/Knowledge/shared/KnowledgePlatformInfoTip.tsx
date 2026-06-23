'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { ADMIN_TRAINING_STATISTICS_ICON_SIZE } from '@/shared/ui/icons';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformInfoTip.module.css';

const ACCESS_LEVELS = [
  {
    title: 'Просмотр',
    text: 'Чтение материалов, прохождение тестов, прогресс видео и последовательное изучение внутри категории. Без комментариев, лайков и избранного.',
  },
  {
    title: 'Участие',
    text: 'Всё из «Просмотра» плюс избранное, отметка «интересный», комментарии под материалами и обратная связь по платформе.',
  },
  {
    title: 'Редактирование',
    text: 'Полное управление категориями и материалами. Порядок изучения не ограничен — доступны все материалы сразу.',
  },
] as const;

const PLATFORM_STEPS = [
  'В разделе доступны только опубликованные материалы — статьи, видео, ссылки и тесты.',
  'Черновики и архив недоступны обучающимся, даже по прямой ссылке.',
  'Порядок материалов в категории задаёт редактор (модули, сортировка, закрепление). По этому же порядку идёт последовательное изучение.',
  'При уровнях «Просмотр» и «Участие» в категории открыт только первый материал; следующий — после завершения предыдущего (на карточке замок).',
  'Материал считается изученным: видео досмотрено, тест пройден на проходной балл, статья без теста или ссылка — просмотрены.',
  'Раздел «Избранное» в меню — быстрый доступ к отмеченным материалам (нужен уровень «Участие»).',
  'Опубликованный материал можно отметить как «интересный» — счётчик видят все (уровень «Участие»).',
  'Под опубликованными материалами можно оставлять комментарии — их видят все обучающиеся (уровень «Участие»).',
  'Статистика обучения доступна сотрудникам с доступом к разделу (кроме стажёров).',
  'Иконка обратной связи рядом с правилами — предложение по улучшению платформы или сообщение об ошибке (уровень «Участие»).',
] as const;

const STUDY_MEANING_ITEMS = [
  '«Изучить» — понять суть и главные моменты, а не заучить текст наизусть.',
  'Следовать порядку материалов внутри категории — заблокированные откроются после предыдущих.',
  'Видео — досмотреть до отметки «Просмотрено»; статья с тестом — набрать проходной балл; статья без теста и ссылка — открыть и ознакомиться.',
  'Успешно проходить тесты по изученным темам.',
  'При уровне «Участие» — пользоваться избранным, комментариями и обратной связью по платформе.',
] as const;

const PLATFORM_HELP = {
  title: 'Правила обучающей платформы',
  note: 'Корпоративная обучающая платформа: статьи, видео, ссылки и тесты после материалов.',
  traineeLead:
    'Уважаемый стажёр, для получения хороших шансов на ваше трудоустройство в компании вам необходимо изучить не менее 30% материалов в каждой категории (кроме категории «Мебель на заказ»).',
} as const;

type KnowledgePlatformInfoTipProps = {
  iconSize?: number;
  triggerClassName?: string;
};

export function KnowledgePlatformInfoTip({
  iconSize = ADMIN_TRAINING_STATISTICS_ICON_SIZE,
  triggerClassName,
}: KnowledgePlatformInfoTipProps = {}) {
  const buttonClassName = triggerClassName
    ? triggerClassName
    : `${cdTemplates.formatBtn} ${styles.trigger}`;

  return (
    <AdminHelpTooltip
      title={PLATFORM_HELP.title}
      align="end"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{PLATFORM_HELP.note}</p>
          <section className={styles.accessSection}>
            <p className={styles.sectionTitle}>Уровни доступа</p>
            <ul className={styles.accessList}>
              {ACCESS_LEVELS.map((level) => (
                <li key={level.title}>
                  <strong>{level.title}</strong> — {level.text}
                </li>
              ))}
            </ul>
          </section>
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
      <button type="button" className={buttonClassName} aria-label={PLATFORM_HELP.title}>
        <AdminHelpInfoIcon size={iconSize} />
      </button>
    </AdminHelpTooltip>
  );
}
