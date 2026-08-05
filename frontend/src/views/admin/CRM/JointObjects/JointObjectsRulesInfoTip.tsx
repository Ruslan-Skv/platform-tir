'use client';

import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { AdminHelpInfoButton } from '@/shared/ui/admin/AdminToolbarIconButton';

import tipStyles from './JointObjectsRulesInfoTip.module.css';

const HELP = {
  title: 'Как работать с совместными объектами',
  note: 'Хаб показывает объекты, где одновременно встречаются два и более направления: окна, двери, потолки, жалюзи, ремонт, мебель. Группировка — по общему адресу и/или заказчику (и связям через пакет документов). Доставки из путевого листа подтягиваются на совпадающий адрес/заказчика.',
} as const;

export function JointObjectsRulesInfoTip() {
  return (
    <AdminHelpTooltip
      title={HELP.title}
      align="center"
      panelClassName={tipStyles.helpPanel}
      body={
        <div className={tipStyles.body}>
          <p className={tipStyles.note}>{HELP.note}</p>
          <section className={tipStyles.section}>
            <p className={tipStyles.sectionTitle}>Что видно</p>
            <ul className={tipStyles.list}>
              <li>Карточка объекта: адрес, заказчики, чипы направлений, число событий и период.</li>
              <li>
                Внутри — общий таймлайн по полосам направлений (ремонт/мебель — полосы сроков,
                монтажи и доставки — точки) и таблица со ссылками в исходные разделы.
              </li>
              <li>
                Закрытые проекты ремонта и мебели по умолчанию скрыты — включите флажок «Включать
                закрытые».
              </li>
            </ul>
          </section>
          <section className={tipStyles.section}>
            <p className={tipStyles.sectionTitle}>Откуда данные</p>
            <ul className={tipStyles.list}>
              <li>
                «Графики монтажей» — окна, двери, потолки, жалюзи (и мебель-монтаж, если есть).
              </li>
              <li>«План-график ремонта» и «План-график мебели» — длинные договоры со сроками.</li>
              <li>«Путевой лист» — доставки материалов на тот же адрес/заказчика.</li>
            </ul>
          </section>
        </div>
      }
    >
      <AdminHelpInfoButton title={HELP.title} aria-label={HELP.title} />
    </AdminHelpTooltip>
  );
}
