'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './SupportChatRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с чатом поддержки',
  note: 'Диалоги клиентов с поддержкой: слева список обращений, справа переписка и ответ. Подходит сотрудникам, которые ведут онлайн-поддержку.',
} as const;

const LIST_ITEMS = [
  'Слева — список диалогов: имя или email клиента, статус, превью последнего сообщения.',
  'Чипы «Статус» сужают список: Открыт, В работе, Закрыт. «Все» показывает всю очередь.',
  'Клик по диалогу открывает переписку справа.',
  'Кнопка обновления в шапке перезагружает список диалогов с сервера.',
] as const;

const CHAT_ITEMS = [
  'Сообщения клиента и ваши ответы отображаются в ленте; свои ответы выделены отдельно.',
  'Введите текст в поле внизу и нажмите «Отправить» или Enter (без Shift).',
  'Пока диалог не выбран, справа показывается подсказка выбрать обращение слева.',
] as const;

const STATUS_ITEMS = [
  'Открыт — новое или ожидающее ответа обращение.',
  'В работе — диалог уже ведётся.',
  'Закрыт — переписка завершена.',
] as const;

const ACTIONS_ITEMS = [
  'Удаление диалога доступно супер-администратору: иконка корзины в шапке чата, с подтверждением. Восстановить нельзя.',
  'На узком экране список и чат располагаются друг под другом — сначала выберите диалог, затем отвечайте.',
] as const;

export function SupportChatRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Список диалогов</p>
            <ul className={styles.list}>
              {LIST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Переписка</p>
            <ul className={styles.list}>
              {CHAT_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Статусы</p>
            <ul className={styles.list}>
              {STATUS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Действия</p>
            <ul className={styles.list}>
              {ACTIONS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      }
    >
      <AdminHelpInfoButton title={HELP.title} aria-label={HELP.title} />
    </AdminHelpTooltip>
  );
}
