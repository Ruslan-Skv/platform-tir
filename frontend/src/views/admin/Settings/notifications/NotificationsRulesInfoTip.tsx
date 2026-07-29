'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './NotificationsRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с уведомлениями в админке',
  note: 'Супер-администратор задаёт, какие события видит каждая роль. Сотрудники сами включают доставку (рабочий стол / PWA и звук) через «Мои уведомления» в колокольчике. Email, Telegram и MAX — отдельно в «Каналах уведомлений о заявках».',
} as const;

const MODES_ITEMS = [
  '«По роли» — профиль настроек для роли (менеджер, поддержка и т.д.) или «По умолчанию» для всех ролей без своего профиля.',
  '«Для пользователя» — персональное переопределение поверх настроек роли (только супер-администратор).',
  '«Покупатели» — уведомления покупателей сайта при ответе в чате поддержки (один пользователь или все сразу).',
  'Стажёры колокольчик в шапке не получают; остальные роли админки — да, по своим флагам событий.',
] as const;

const EVENTS_ITEMS = [
  'Отметьте галочками события: отзывы, заказы, чат поддержки, формы и квизы, обучение, учёт рабочего времени.',
  'Обратная связь по обучению и публичному сайту доступна в настройках супер-администратору.',
  'События влияют и на список в колокольчике, и на push, если включены браузерные уведомления.',
] as const;

const SOUND_ITEMS = [
  'Включите звук, выберите тип (beep, ding, chime, bell) или загрузите свой файл.',
  'Громкость и «Проверить звук» помогают сразу услышать результат.',
] as const;

const PUSH_ITEMS = [
  'Сотрудники с колокольчиком включают браузерные / PWA-уведомления сами: колокольчик → «Мои уведомления».',
  '«Уведомления на рабочем столе и в приложении (PWA)» на этой странице — для профиля роли или полного override пользователя (супер-админ).',
  'Интервал проверки задаёт, как часто обновляется лента колокольчика.',
  'После включения desktop/push браузер может запросить разрешение — его нужно разрешить.',
] as const;

const CHANNELS_ITEMS = [
  'Каналы email / Telegram / MAX для заявок и внешних алертов — в разделе «Каналы уведомлений о заявках», не на этой странице.',
  'Ссылка на него есть в подзаголовке страницы и в настройках системы.',
] as const;

export function NotificationsRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Режимы редактирования</p>
            <ul className={styles.list}>
              {MODES_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>События</p>
            <ul className={styles.list}>
              {EVENTS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Звук</p>
            <ul className={styles.list}>
              {SOUND_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Браузер и push</p>
            <ul className={styles.list}>
              {PUSH_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Внешние каналы</p>
            <ul className={styles.list}>
              {CHANNELS_ITEMS.map((item) => (
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
