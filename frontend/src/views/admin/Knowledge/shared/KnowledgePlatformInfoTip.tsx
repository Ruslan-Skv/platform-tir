'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './KnowledgePlatformInfoTip.module.css';

const PLATFORM_HELP = {
  title: 'Правила обучающей платформы',
  note: 'Корпоративная обучающая платформа: статьи, видео, ссылки и тесты после материалов.',
  steps: [
    'Все сотрудники с доступом к разделу видят только опубликованные материалы и могут проходить обучение.',
    'Обучающиеся читают статьи, смотрят видео и проходят тесты; черновики и архив недоступны, даже по прямой ссылке.',
    'Любой сотрудник может отметить опубликованный материал как «интересный» — счётчик видят все.',
    'Под опубликованными материалами можно оставлять комментарии — их видят все обучающиеся.',
    'Рекомендации для тьютора и редактирование контента доступны только суперадмину.',
    'Суперадмин создаёт и редактирует материалы, категории, модули, тесты, целевую аудиторию и рекомендации для тьютора.',
    'Суперадмин видит черновики и архив; остальные роли — только просмотр и обучение.',
    'Статистика обучения доступна всем сотрудникам с доступом к разделу.',
    'Черновик — материал готовится, обучающиеся его не видят.',
    'Опубликован — доступен для обучения всем ролям с доступом к разделу.',
    'Архив — снят с обучения, виден только суперадмину.',
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
