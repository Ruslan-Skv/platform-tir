import { Prisma } from '@prisma/client';
import { DEFAULT_QUIZ_THEME, quizDefaultImage } from '../src/quiz/quiz.types';

export const MEBEL_QUIZ_STEPS = [
  {
    key: 'furniture_type',
    sortOrder: 0,
    type: 'choice',
    title: 'Что вам нужно?',
    subtitle: 'Выберите тип мебели',
    required: true,
    options: [
      { value: 'kitchen', label: 'Кухня', imageUrl: quizDefaultImage('kitchen') },
      { value: 'wardrobe', label: 'Шкаф', imageUrl: quizDefaultImage('wardrobe') },
      { value: 'dressing_room', label: 'Гардеробная', imageUrl: quizDefaultImage('dressing_room') },
      { value: 'bedroom', label: 'Спальня', imageUrl: quizDefaultImage('bedroom') },
      { value: 'other', label: 'Другое', imageUrl: quizDefaultImage('other') },
    ],
  },
  {
    key: 'layout',
    sortOrder: 1,
    type: 'choice',
    title: 'Выберите планировку кухни',
    required: true,
    showWhen: { branchKey: 'furniture_type', values: ['kitchen'] },
    options: [
      { value: 'straight', label: 'Прямая', imageUrl: quizDefaultImage('straight') },
      { value: 'corner', label: 'Угловая', imageUrl: quizDefaultImage('corner') },
      { value: 'u_shape', label: 'П-образная', imageUrl: quizDefaultImage('u_shape') },
      { value: 'island', label: 'С островом', imageUrl: quizDefaultImage('island') },
    ],
  },
  {
    key: 'facade',
    sortOrder: 2,
    type: 'choice',
    title: 'Выберите материал фасадов',
    required: true,
    showWhen: {
      branchKey: 'furniture_type',
      values: ['kitchen', 'wardrobe', 'dressing_room', 'bedroom'],
    },
    options: [
      { value: 'mdf_film', label: 'МДФ в плёнке', imageUrl: quizDefaultImage('mdf_film') },
      { value: 'plastic', label: 'Пластик', imageUrl: quizDefaultImage('plastic') },
      { value: 'enamel', label: 'Эмаль', imageUrl: quizDefaultImage('enamel') },
      { value: 'solid_wood', label: 'Фасады из массива', imageUrl: quizDefaultImage('solid_wood') },
      { value: 'undecided', label: 'Не определились', imageUrl: quizDefaultImage('undecided') },
    ],
  },
  {
    key: 'dimensions',
    sortOrder: 3,
    type: 'text',
    title: 'Введите размеры',
    subtitle: 'Пример: 2.2 × 1.6 м. Если не знаете — поставьте «-»',
    placeholder: '2.2 × 1.6 м',
    required: true,
  },
  {
    key: 'urgency',
    sortOrder: 4,
    type: 'choice',
    title: 'Как срочно нужна мебель?',
    required: true,
    options: [
      { value: 'urgent', label: 'Срочно', imageUrl: quizDefaultImage('urgent') },
      { value: 'this_month', label: 'В этом месяце', imageUrl: quizDefaultImage('this_month') },
      { value: 'next_month', label: 'На след. месяц', imageUrl: quizDefaultImage('next_month') },
      { value: 'two_months', label: 'В течение двух месяцев', imageUrl: quizDefaultImage('two_months') },
    ],
  },
  {
    key: 'contact_channel',
    sortOrder: 5,
    type: 'choice',
    title: 'Куда отправить расчёт стоимости?',
    required: true,
    options: [
      { value: 'telegram', label: 'Telegram', imageUrl: quizDefaultImage('telegram') },
      { value: 'phone', label: 'Бесплатная консультация по телефону', imageUrl: quizDefaultImage('phone') },
      { value: 'max', label: 'MAX', imageUrl: quizDefaultImage('max') },
    ],
  },
  {
    key: 'contact',
    sortOrder: 6,
    type: 'contact',
    title: 'Введите номер телефона',
    subtitle: 'За этим номером мы закрепим подарок по акции',
    required: true,
  },
] as const;

export function mebelQuizStepCreateInput() {
  return MEBEL_QUIZ_STEPS.map((step) => ({
    key: step.key,
    sortOrder: step.sortOrder,
    type: step.type,
    title: step.title,
    subtitle: 'subtitle' in step ? step.subtitle : null,
    placeholder: 'placeholder' in step ? step.placeholder : null,
    required: step.required,
    options: 'options' in step ? (step.options as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
    showWhen:
      'showWhen' in step && step.showWhen
        ? (step.showWhen as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
  }));
}
