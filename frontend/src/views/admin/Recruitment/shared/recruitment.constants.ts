export const SKILL_FIELDS = [
  { key: 'communicationSkill', label: 'Коммуникабельность' },
  { key: 'stressResistance', label: 'Стрессоустойчивость' },
  { key: 'motivation', label: 'Мотивация' },
  { key: 'teamworkSkill', label: 'Работа в команде' },
  { key: 'selfOrganization', label: 'Самоорганизация' },
  { key: 'pcSkill', label: 'Владение ПК' },
  { key: 'presentationSkill', label: 'Навыки презентации' },
] as const;

export const BLANK_SECTIONS = [
  {
    title: '1. Личные данные',
    fields: [
      { label: 'Фамилия', lines: 1 },
      { label: 'Имя', lines: 1 },
      { label: 'Отчество', lines: 1 },
      { label: 'Дата рождения', lines: 1 },
      { label: 'Телефон', lines: 1 },
      { label: 'Email', lines: 1 },
      { label: 'Город', lines: 1 },
      { label: 'Адрес', lines: 1 },
    ],
  },
  {
    title: '2. Образование',
    fields: [
      { label: 'Уровень образования', lines: 1 },
      { label: 'Учебное заведение', lines: 1 },
      { label: 'Специальность', lines: 1 },
      { label: 'Год окончания', lines: 1 },
      { label: 'Дополнительное образование, курсы', lines: 2 },
    ],
  },
  {
    title: '3. Опыт работы',
    fields: [
      { label: 'Общий стаж (лет)', lines: 1 },
      { label: 'Опыт в продажах (лет)', lines: 1 },
      { label: 'Отраслевой опыт (двери, мебель, ремонт и т.д.)', lines: 1 },
      {
        label: 'Место работы 1: компания, должность, период, обязанности, достижения',
        lines: 3,
      },
      {
        label: 'Место работы 2: компания, должность, период, обязанности, достижения',
        lines: 3,
      },
      { label: 'Ключевые достижения в продажах', lines: 2 },
    ],
  },
  {
    title: '4. Навыки и компетенции (оцените от 1 до 10)',
    fields: SKILL_FIELDS.map((s) => ({ label: s.label, lines: 1 })),
  },
  {
    title: '5. Мотивация и условия',
    fields: [
      { label: 'Почему хотите работать в нашей компании?', lines: 2 },
      { label: 'Сколько планируете проработать в компании', lines: 1 },
      { label: 'Ожидания по заработной плате', lines: 1 },
      { label: 'Дата, с которой готовы приступить', lines: 1 },
      { label: 'Водительские права (да/нет)', lines: 1 },
      { label: 'Личный автомобиль (да/нет)', lines: 1 },
      { label: 'Готовность изучить необходимую для работы информацию (да/нет)', lines: 1 },
      { label: 'Готовность постоянно совершенствоваться, обучаясь (да/нет)', lines: 1 },
      { label: 'Знание продукции (двери, мебель, ремонт)', lines: 2 },
    ],
  },
];
