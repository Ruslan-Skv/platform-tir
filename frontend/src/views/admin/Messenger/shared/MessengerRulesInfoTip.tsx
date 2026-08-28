'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './MessengerRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с мессенджером',
  note: 'Командный мессенджер админки: каналы, личные чаты и отдельные треды у канбан-карточек. Сообщения появляются в реальном времени.',
} as const;

const CHANNEL_ITEMS = [
  'Слева вкладки «Каналы» и «Личные». Канал «Общий» создаётся автоматически и доступен всем сотрудникам админки.',
  '«Новый канал» (при праве редактирования) создаёт групповой чат с выбранными участниками.',
  'В шапке активного канала можно увидеть список участников.',
] as const;

const DM_ITEMS = [
  '«Новый чат» открывает личную переписку с выбранным сотрудником. Повторный выбор того же человека открывает существующий диалог.',
  'Личный чат видят только двое участников.',
] as const;

const MSG_ITEMS = [
  'К сообщениям можно добавлять смайлики кнопкой 😊 слева от поля ввода — эмодзи вставляются в текст.',
  'О новых сообщениях приходят уведомления в колокольчик админки (и Web Push, если включён).',
  'Непрочитанные считаются по сообщениям новее вашей последней отметки «прочитано» (открытие чата отмечает прочитанным).',
  'Чат задачи на канбан-карточке — отдельный тред и не смешивается с комментариями карточки.',
] as const;

const ACCESS_ITEMS = [
  'Просмотр — читать чаты, где вы участник, и писать сообщения.',
  'Редактирование — создавать каналы и управлять составом участников каналов.',
  'Права выдаются в сайдбаре через «Доступ» у пункта «Мессенджер» или ролью по умолчанию.',
] as const;

export function MessengerRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Каналы</p>
            <ul className={styles.list}>
              {CHANNEL_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Личные чаты</p>
            <ul className={styles.list}>
              {DM_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Сообщения</p>
            <ul className={styles.list}>
              {MSG_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Доступ</p>
            <ul className={styles.list}>
              {ACCESS_ITEMS.map((item) => (
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
