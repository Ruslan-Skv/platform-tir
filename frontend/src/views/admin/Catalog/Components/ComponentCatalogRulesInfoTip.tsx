'use client';

import { AdminHelpInfoIcon } from '@/shared/ui/admin/AdminHelpInfoIcon';
import { AdminHelpTooltip } from '@/shared/ui/admin/AdminHelpTooltip';
import { ADMIN_TRAINING_STATISTICS_ICON_SIZE } from '@/shared/ui/icons';
import cdTemplates from '@/views/admin/ContractDocuments/styles/templates-library.module.css';

import styles from './ComponentCatalogRulesInfoTip.module.css';

const COMPONENT_CATALOG_HELP = {
  title: 'Правила справочника комплектующих',
  note: 'Единый каталог погонажа для дверей: цены задаются один раз в справочнике и подтягиваются во всех карточках товаров.',
  steps: [
    'Группа моделей — серия дверей (ЛОФТ, Классика и т.п.). К ней относятся все подгруппы комплектующих этой серии.',
    'Подгруппа — вариант по цвету или отделке: набор стойки коробки, наличника, добора и планки одного цвета. Её можно привязать к карточке двери целиком.',
    'Позиция справочника — одна строка прайса: вид, название, размер, цвет, материал, цена. Slug строится из названия, размера, цвета и материала — одно название допустимо при разном цвете.',
    'Для нового цвета нажмите «Копировать подгруппу»: создаются копии всех позиций с указанным цветом. При необходимости задайте единую корректировку цены, затем отредактируйте отдельные позиции.',
    'Новую позицию в подгруппу удобнее создавать из состава подгруппы — она сразу попадёт в неё после сохранения.',
    'Одну позицию можно скопировать кнопкой в таблице позиций — измените цвет или цену и сохраните как новую запись.',
    'В карточке двери: привязка всей подгруппы или отдельных позиций. Цены и состав комплекта берутся из справочника.',
    'Удаление подгруппы не удаляет позиции каталога. Удаление группы моделей удаляет все её подгруппы.',
    'Скрытые (неактивные) позиции и подгруппы не предлагаются при привязке к товарам.',
  ],
} as const;

type ComponentCatalogRulesInfoTipProps = {
  iconSize?: number;
  triggerClassName?: string;
};

export function ComponentCatalogRulesInfoTip({
  iconSize = ADMIN_TRAINING_STATISTICS_ICON_SIZE,
  triggerClassName,
}: ComponentCatalogRulesInfoTipProps = {}) {
  const buttonClassName = triggerClassName
    ? triggerClassName
    : `${cdTemplates.formatBtn} ${styles.trigger}`;

  return (
    <AdminHelpTooltip
      title={COMPONENT_CATALOG_HELP.title}
      note={COMPONENT_CATALOG_HELP.note}
      steps={COMPONENT_CATALOG_HELP.steps}
      align="end"
      panelClassName={styles.helpPanel}
    >
      <button type="button" className={buttonClassName} aria-label={COMPONENT_CATALOG_HELP.title}>
        <AdminHelpInfoIcon size={iconSize} />
      </button>
    </AdminHelpTooltip>
  );
}
