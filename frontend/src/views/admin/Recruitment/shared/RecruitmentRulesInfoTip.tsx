'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './RecruitmentRulesInfoTip.module.css';

const RECRUITMENT_HELP = {
  title: 'Правила работы в разделе подбора менеджеров',
  note: 'Учёт кандидатов на должность менеджера по продажам: анкеты, резюме, обучение и сравнительная аналитика.',
  steps: [
    'Каждый цикл подбора оформляется как отдельный «отбор». Одновременно может быть открыт только один отбор.',
    'Новые кандидаты автоматически попадают в текущий открытый отбор.',
    'Список и аналитика показывают только кандидатов выбранного отбора — кандидаты прошлых циклов не смешиваются с новыми.',
    'По итогам отбора закройте его: при необходимости укажите выбранного кандидата и заметки. Остальные активные кандидаты этого отбора будут отклонены.',
    'Для следующего поиска (например, через несколько месяцев) создайте новый отбор — в нём будут учитываться только новые кандидаты.',
    'Заполняйте анкету и загружайте резюме (PDF, DOCX, TXT) — ключевые данные из файла подставляются автоматически.',
    'Для отслеживания обучения на «Территории знаний» привяжите к карточке email пользователя на платформе.',
    'Сравнительная аналитика формирует рейтинг по анкете, резюме, собеседованию и прогрессу обучения.',
    'Бланк анкеты можно распечатать и выдать кандидату для заполнения вручную.',
  ],
} as const;

export function RecruitmentRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={RECRUITMENT_HELP.title}
      steps={RECRUITMENT_HELP.steps}
      note={RECRUITMENT_HELP.note}
      align="end"
    >
      <button
        type="button"
        className={`${cdTemplates.formatBtn} ${styles.trigger}`}
        aria-label={RECRUITMENT_HELP.title}
      >
        <AdminHelpInfoIcon />
      </button>
    </AdminHelpTooltip>
  );
}
