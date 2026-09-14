'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './MyNotificationsRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с моими уведомлениями',
  note: 'Личные настройки уведомлений: какие события показывать в колокольчике, звук и браузерные push. По умолчанию наследуются от вашей роли и переопределяются лично для себя.',
} as const;

const GENERAL_ITEMS = [
  'Бейдж рядом с заголовком показывает источник настроек: «Настройки роли» — персональных правок ещё нет, «Личные настройки» — применяются ваши переопределения.',
  'Кнопка «Сохранить» активна только после внесения правок.',
  '«Сбросить к настройкам роли» удаляет личные настройки — снова действует профиль вашей роли.',
] as const;

const EVENTS_ITEMS = [
  'Отметьте события, по которым присылать уведомления: отзывы, заказы, чат поддержки, формы и квизы, обучение, учёт рабочего времени, путевые листы, графики монтажей / ремонтов / мебели, электронное подписание договоров.',
  'События подписания договоров (подписан, отклонён, открыт клиентом) приходят лично менеджеру, отправившему документы на подписание.',
  'Флаги влияют и на ленту колокольчика в шапке, и на браузерные push-уведомления.',
  'Список событий по умолчанию задаёт администратор на странице «Уведомления в админке».',
] as const;

const SOUND_ITEMS = [
  'Включите «Звук при новом событии», выберите тип (beep, ding, chime, bell) или свой загруженный файл.',
  'Слайдер громкости и кнопка «Проверить звук» помогают сразу услышать результат.',
  'Загрузка и удаление своих звуков доступны ролям с доступом к разделу «Уведомления в админке».',
] as const;

const PUSH_ITEMS = [
  '«На рабочем столе и в приложении (PWA)» включает уведомления вне вкладки браузера и на телефоне, если сайт установлен как приложение.',
  'Разрешение браузера выдаётся отдельно на каждом устройстве и в каждом браузере: если приложение установлено на компьютере и на телефоне — включите уведомления и разрешите их на обоих устройствах (настройки событий общие, а подписка и разрешение — свои у каждого устройства).',
  'При включении браузер запросит разрешение — нажмите «Разрешить». Если разрешение заблокировано, измените его в настройках браузера.',
  '«Интервал проверки» задаёт, как часто обновляется лента колокольчика (от 30 секунд до 5 минут).',
] as const;

export function MyNotificationsRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Общее</p>
            <ul className={styles.list}>
              {GENERAL_ITEMS.map((item) => (
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
        </div>
      }
    >
      <AdminHelpInfoButton title={HELP.title} aria-label={HELP.title} />
    </AdminHelpTooltip>
  );
}
