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
  'Справа в шапке: «Оплаты и этапы», счета, заказ-наряды, анкеты, журнал событий, обновление с сервера и печать активной вкладки.',
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
  'Анкеты — опросники менеджера / оценка работы без переключения по всем вкладкам.',
] as const;

const LOCK_ITEMS = [
  'После «Договор подписан» блоки «Заказчик», «Исполнитель», «Договор и объект» и текст договора обычно только для просмотра.',
  'Новые объёмы после подписания оформляйте через доп. соглашения и новые расчёты на вкладках Д/с.',
  'При статусе отказа или закрытия часть действий в хабе может быть недоступна — смотрите подсказки на кнопках.',
] as const;

const WORKFLOW_ITEMS = [
  'Сначала заполните «Данные» и привяжите заказчика, затем смету и документы.',
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
