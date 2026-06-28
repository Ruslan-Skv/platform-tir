import type { LeadSource, UnifiedLeadItem } from '@/shared/api/admin-leads';
import type { AdminNotificationsSettings } from '@/shared/api/admin-notifications';
import type { AdminReview } from '@/shared/api/admin-reviews';
import type { AdminSupportConversation } from '@/shared/api/admin-support';

export type AdminBellNotificationType =
  | 'review'
  | 'order'
  | 'support'
  | 'form'
  | 'quizMebel'
  | 'quizRemont'
  | 'knowledgeFeedback'
  | 'siteFeedback';

export type AdminBellNotificationItem = {
  type: AdminBellNotificationType;
  id: string;
  date: string;
  link: string;
  text: string;
};

export function leadSourceToBellType(source: LeadSource): AdminBellNotificationType | null {
  switch (source) {
    case 'form_measurement':
    case 'form_callback':
    case 'form_director':
    case 'form_quote':
      return 'form';
    case 'quiz_mebel':
      return 'quizMebel';
    case 'quiz_remont':
      return 'quizRemont';
    case 'order':
      return 'order';
    case 'knowledge_feedback':
      return 'knowledgeFeedback';
    case 'site_feedback':
      return 'siteFeedback';
    default:
      return null;
  }
}

export function isLeadSourceNotifiable(
  source: LeadSource,
  settings: AdminNotificationsSettings | null,
  hasAccess: (resourceId: string) => boolean
): boolean {
  if (!settings) return true;
  switch (source) {
    case 'form_measurement':
      return settings.notifyOnMeasurementForm !== false;
    case 'form_callback':
      return settings.notifyOnCallbackForm !== false;
    case 'form_director':
      return settings.notifyOnDirectorForm !== false;
    case 'form_quote':
      return settings.notifyOnQuoteForm !== false;
    case 'quiz_mebel':
      return hasAccess('admin.quiz.mebel') && settings.notifyOnQuizMebel !== false;
    case 'quiz_remont':
      return hasAccess('admin.quiz.remont') && settings.notifyOnQuizRemont !== false;
    case 'order':
      return settings.notifyOnOrders !== false;
    case 'knowledge_feedback':
      return settings.notifyOnKnowledgeFeedback !== false;
    case 'site_feedback':
      return settings.notifyOnSiteFeedback !== false;
    default:
      return false;
  }
}

export function filterNotifiableLeads(
  leads: UnifiedLeadItem[],
  settings: AdminNotificationsSettings | null,
  hasAccess: (resourceId: string) => boolean
): UnifiedLeadItem[] {
  return leads.filter((lead) => isLeadSourceNotifiable(lead.source, settings, hasAccess));
}

export function leadToBellNotificationItem(
  lead: UnifiedLeadItem
): AdminBellNotificationItem | null {
  const type = leadSourceToBellType(lead.source);
  if (!type) return null;

  let text = `${lead.sourceLabel} от ${lead.name}`;
  if (lead.source === 'order') {
    const orderNumber =
      typeof lead.payload.orderNumber === 'string' ? lead.payload.orderNumber : null;
    text = orderNumber
      ? `Новый заказ ${orderNumber} от ${lead.name}`
      : `${lead.sourceLabel} от ${lead.name}`;
  } else if (lead.source === 'site_feedback' || lead.source === 'knowledge_feedback') {
    const fbType = lead.payload.type as string | undefined;
    if (lead.source === 'site_feedback') {
      text =
        fbType === 'BUG'
          ? `Ошибка на сайте от ${lead.name}`
          : `Предложение по сайту от ${lead.name}`;
    } else {
      text =
        fbType === 'BUG'
          ? `Ошибка на платформе от ${lead.name}`
          : `Предложение по платформе от ${lead.name}`;
    }
  }

  const link =
    lead.detailUrl ??
    (lead.source.startsWith('form_') || lead.source.startsWith('quiz_')
      ? '/admin/leads'
      : '/admin/leads');

  return {
    type,
    id: lead.id,
    date: lead.createdAt,
    link,
    text,
  };
}

export function reviewToBellNotificationItem(review: AdminReview): AdminBellNotificationItem {
  return {
    type: 'review',
    id: review.id,
    date: review.createdAt,
    link: `/admin/catalog/products/${review.productId}/edit`,
    text: `Новый отзыв на «${review.product?.name || 'Товар'}» от ${review.userName}`,
  };
}

export function supportToBellNotificationItem(
  conversation: AdminSupportConversation
): AdminBellNotificationItem {
  const userName =
    conversation.user?.firstName || conversation.user?.lastName
      ? `${conversation.user.firstName || ''} ${conversation.user.lastName || ''}`.trim()
      : conversation.user?.email || 'клиента';

  return {
    type: 'support',
    id: conversation.id,
    date: conversation.updatedAt,
    link: '/admin/support',
    text: `Сообщение в чате от ${userName}`,
  };
}

export function isBellTypeEnabled(
  type: AdminBellNotificationType,
  settings: AdminNotificationsSettings | null
): boolean {
  if (!settings) return true;
  switch (type) {
    case 'review':
      return settings.notifyOnReviews !== false;
    case 'order':
      return settings.notifyOnOrders !== false;
    case 'support':
      return settings.notifyOnSupportChat !== false;
    case 'form':
      return (
        settings.notifyOnMeasurementForm !== false ||
        settings.notifyOnCallbackForm !== false ||
        settings.notifyOnDirectorForm !== false ||
        settings.notifyOnQuoteForm !== false
      );
    case 'quizMebel':
      return settings.notifyOnQuizMebel !== false;
    case 'quizRemont':
      return settings.notifyOnQuizRemont !== false;
    case 'knowledgeFeedback':
      return settings.notifyOnKnowledgeFeedback !== false;
    case 'siteFeedback':
      return settings.notifyOnSiteFeedback !== false;
    default:
      return false;
  }
}

export function buildDesktopNotification(item: AdminBellNotificationItem): {
  title: string;
  body: string;
  tag: string;
} {
  const tag = `${item.type}-${item.id}`;
  switch (item.type) {
    case 'review':
      return { title: 'Новый отзыв', body: item.text.replace(/^Новый отзыв на /, ''), tag };
    case 'order':
      return { title: 'Новый заказ', body: item.text.replace(/^Новый заказ /, ''), tag };
    case 'support':
      return {
        title: 'Сообщение в чате',
        body: item.text.replace(/^Сообщение в чате от /, ''),
        tag,
      };
    case 'form':
      return { title: 'Новая заявка', body: item.text, tag };
    case 'quizMebel':
      return {
        title: 'Квиз — Мебель на заказ',
        body: item.text.replace(/^Квиз — Мебель[^ ]* /, ''),
        tag,
      };
    case 'quizRemont':
      return {
        title: 'Квиз — Ремонт и отделка',
        body: item.text.replace(/^Квиз — Ремонт[^ ]* /, ''),
        tag,
      };
    case 'knowledgeFeedback':
      return {
        title: item.text.startsWith('Ошибка')
          ? 'Ошибка на обучающей платформе'
          : 'Предложение по обучающей платформе',
        body: item.text.replace(/^(Ошибка на платформе|Предложение по платформе) от /, ''),
        tag,
      };
    case 'siteFeedback':
      return {
        title: item.text.startsWith('Ошибка') ? 'Ошибка на сайте' : 'Предложение по сайту',
        body: item.text.replace(/^(Ошибка на сайте|Предложение по сайту) от /, ''),
        tag,
      };
    default:
      return { title: 'Уведомление', body: item.text, tag };
  }
}

export function leadsToBellNotificationItems(
  leads: UnifiedLeadItem[]
): AdminBellNotificationItem[] {
  return leads
    .map(leadToBellNotificationItem)
    .filter((item): item is AdminBellNotificationItem => item !== null);
}
