'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import styles from './PackageDocumentEditorRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с пакетом договора',
  note: 'Карточка пакета документов по выбранному направлению: данные сторон, смета, печатные формы, доп. соглашения, оплаты и этапы. Удобнее работать на компьютере — на телефоне полный редактор не открывается из списка.',
} as const;

const HEADER_ITEMS = [
  '«← К списку договоров» — возврат к общему списку с фильтрами и очередями.',
  'В заголовке — номер договора; дата «от …» появляется после статуса «Договор подписан».',
  'Справа в шапке: «Оплаты и этапы», счета, заказ-наряды, анкеты, журнал событий, отправка документов заказчику (иконка «Поделиться»), дистанционное подписание («ЭП»), обновление с сервера и печать активной вкладки.',
] as const;

const TABS_ITEMS = [
  '«Данные» — заказчик из базы, объект, менеджер, исполнитель и реквизиты договора.',
  '«Смета» — объект и прикреплённые расчёты; сумма подтягивается в данные договора.',
  '«Договор», «Согласие», акты, накладная, памятка и другие вкладки — тексты и печатные формы.',
  '«Д/с №…» — дополнительные соглашения (можно добавить/убрать слоты); после подписания вкладка чаще только для просмотра и печати.',
  'Порядок вкладок можно менять перетаскиванием в строке вкладок.',
] as const;

const HUB_ITEMS = [
  '«Оплаты и этапы» — журнал оплат, смена этапов пайплайна, подписание договора и Д/с.',
  'Счета и заказ-наряды — отдельные хабы списков по этому пакету.',
  'В хабе счетов у выставленного счёта есть «Отправить» — можно переслать PDF заказчику через Telegram, WhatsApp, MAX или почту.',
  'Анкеты — опросники менеджера / оценка работы без переключения по всем вкладкам.',
] as const;

const SHARE_ITEMS = [
  'Иконка «Поделиться» в шапке — отправить заказчику выбранные документы пакета (договор, смета, акты, Д/с, спецификации и т.д.) без подписания: Telegram, WhatsApp, MAX, почта или системный «Поделиться».',
  'Те же действия доступны из списка договоров — иконка «Поделиться» в строке / карточке.',
  'Документы собираются как PDF на вашем компьютере; сервер их не рассылает сам — вы открываете мессенджер или письмо с готовым текстом и вложением.',
] as const;

const REMOTE_SIGN_ITEMS = [
  'Кнопка «ЭП» — дистанционное ознакомление и подписание без визита в офис (без КЭП / Госключ / Контур): заказчик открывает ссылку, смотрит PDF и подтверждает подписание кодом.',
  'В модалке сначала отметьте документы → «Создать ссылку». Система готовит PDF-снимки и выдаёт ссылку плюс одноразовый код (OTP, 6 цифр).',
  'На втором шаге модалки отправьте ссылку и код заказчику: WhatsApp, Telegram, MAX, почта или «Копировать». Можно сразу включить отправку письма на e-mail.',
  'Заказчик на странице /sign/… просматривает документы, вводит ФИО, код и согласие. После успешного кода пакет отмечается как «Договор подписан».',
  'Пока ссылка активна, в списке договоров под статусом видно «На согласовании» или «Просмотрено заказчиком». Новая ссылка отзывает предыдущую активную.',
  'Подписание через «ЭП» не заменяет оформление на бумаге при необходимости — это быстрый дистанционный контур согласования и фиксации статуса в системе.',
] as const;

const LOCK_ITEMS = [
  'После «Договор подписан» блоки «Заказчик», «Исполнитель», «Договор и объект» и текст договора обычно только для просмотра.',
  'Новые объёмы после подписания оформляйте через доп. соглашения и новые расчёты на вкладках Д/с.',
  'При статусе отказа или закрытия часть действий в хабе может быть недоступна — смотрите подсказки на кнопках.',
] as const;

const WORKFLOW_ITEMS = [
  'Сначала заполните «Данные» и привяжите заказчика, затем смету и документы.',
  'Перед отправкой заказчику или на «ЭП» проверьте телефон и e-mail в данных заказчика — они подставляются в модалки.',
  'Печать берёт активную вкладку (договор, смета, спецификация, заказ-наряд и т.д.).',
  'Обновление в шапке перечитывает пакет с сервера — несохранённые правки на вкладке могут пропасть, если их не успели записать.',
] as const;

export function PackageDocumentEditorRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={styles.helpPanel}
      body={
        <div className={styles.body}>
          <p className={styles.note}>{HELP.note}</p>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Шапка</p>
            <ul className={styles.list}>
              {HEADER_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Вкладки</p>
            <ul className={styles.list}>
              {TABS_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Хабы</p>
            <ul className={styles.list}>
              {HUB_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Отправка документов заказчику</p>
            <ul className={styles.list}>
              {SHARE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Дистанционное подписание («ЭП»)</p>
            <ul className={styles.list}>
              {REMOTE_SIGN_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Подписание и блокировки</p>
            <ul className={styles.list}>
              {LOCK_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className={styles.section}>
            <p className={styles.sectionTitle}>Порядок работы</p>
            <ul className={styles.list}>
              {WORKFLOW_ITEMS.map((item) => (
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
