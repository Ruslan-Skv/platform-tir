'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformInfoTip.module.css';

const PLATFORM_HELP = {
  title: 'Правила обучающей платформы',
  note: 'Корпоративная обучающая платформа: статьи, видео, ссылки и тесты после материалов.',
  steps: [
    'Менеджеры и стажёры видят только опубликованные материалы.',
    'Обучающиеся читают статьи, смотрят видео и проходят тесты; черновики и архив недоступны, даже по прямой ссылке.',
    'Менеджеры и стажёры не видят рекомендации для тьютора и не могут редактировать контент.',
    'Редакторы (админ, контент-менеджер) создают и редактируют материалы, категории и модули.',
    'Редакторы видят черновики, архив и статистику, настраивают тесты, целевую аудиторию и рекомендации для тьютора.',
    'Черновик — материал готовится, обучающиеся его не видят.',
    'Опубликован — доступен менеджерам, стажёрам и другим ролям с доступом к разделу.',
    'Архив — снят с обучения, виден только редакторам.',
  ],
} as const;

export function KnowledgePlatformInfoTip() {
  return (
    <AdminHelpTooltip
      title={PLATFORM_HELP.title}
      steps={PLATFORM_HELP.steps}
      note={PLATFORM_HELP.note}
      align="end"
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
