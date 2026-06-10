export type RepairWorkPeriodFieldHelpContext = {
  packageKindLabel: string;
  contractLocked: boolean;
  workPeriodIsManual: boolean;
  isSuperAdmin: boolean;
  placeholderDays: string;
};

const SUPER_ADMIN_ONLY_STEP =
  'Менять срок договора могут только пользователи с ролью суперадмин: и в разделе «Сроки договоров», и вручную в поле «Срок дог.» в карточке договора.';

export function repairWorkPeriodFieldHelp({
  packageKindLabel,
  contractLocked,
  workPeriodIsManual,
  isSuperAdmin,
  placeholderDays,
}: RepairWorkPeriodFieldHelpContext): {
  title: string;
  steps: readonly string[];
  note?: string;
} {
  if (contractLocked) {
    return {
      title: 'Срок договора',
      steps: [
        'Срок считается в рабочих днях.',
        'Договор уже подписан (или отмечен как отказ) — изменить срок нельзя никому, включая суперадмина.',
        'В печатных документах используется сохранённое значение и плейсхолдер {{contract.workPeriod}}.',
        SUPER_ADMIN_ONLY_STEP,
      ],
      note: 'До подписания срок задавал и мог менять только суперадмин.',
    };
  }

  if (!isSuperAdmin) {
    return {
      title: 'Срок договора',
      steps: [
        'Срок выполнения работ по договору в рабочих днях (направление «' +
          packageKindLabel +
          '»).',
        SUPER_ADMIN_ONLY_STEP,
        'Значение по умолчанию и массовое обновление задаёт суперадмин в разделе «Сроки договоров».',
        'В этой карточке поле только для просмотра.',
        'Подставляется в шаблон: {{contract.workPeriod}}.',
      ],
      note: `Ориентир по умолчанию для новых договоров: ${placeholderDays} раб. дн. (если суперадмин не задал срок вручную в карточке).`,
    };
  }

  if (workPeriodIsManual) {
    return {
      title: 'Срок договора (задан вручную)',
      steps: [
        'Срок считается в рабочих днях.',
        SUPER_ADMIN_ONLY_STEP,
        'Ручное изменение в этой карточке доступно только суперадмину; срок закреплён за договором.',
        'Массовое обновление из «Сроки договоров» этот договор не затронет.',
        'До подписания срок вручную снова может изменить только суперадмин; после подписания — только просмотр.',
        'В шаблоне: {{contract.workPeriod}}.',
      ],
    };
  }

  return {
    title: 'Срок договора',
    steps: [
      'Срок выполнения работ в рабочих днях.',
      SUPER_ADMIN_ONLY_STEP,
      `По умолчанию берётся из «Сроки договоров» → «${packageKindLabel}» (сейчас ориентир: ${placeholderDays} раб. дн.).`,
      'Если суперадмин введёт другое число в этом поле — срок станет ручным и не будет меняться массовым обновлением (сделать это может только суперадмин).',
      'Массовое обновление в настройках (только суперадмин) меняет неподписанные договоры без ручного срока.',
      'Плейсхолдер в шаблоне: {{contract.workPeriod}}.',
    ],
    note: 'Подписанные договоры из настроек не обновляются.',
  };
}
