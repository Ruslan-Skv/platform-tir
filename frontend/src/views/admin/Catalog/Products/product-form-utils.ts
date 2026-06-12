const SITE_NAME = 'Территория интерьерных решений';

const TRANSLITERATION_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  А: 'A',
  Б: 'B',
  В: 'V',
  Г: 'G',
  Д: 'D',
  Е: 'E',
  Ё: 'Yo',
  Ж: 'Zh',
  З: 'Z',
  И: 'I',
  Й: 'Y',
  К: 'K',
  Л: 'L',
  М: 'M',
  Н: 'N',
  О: 'O',
  П: 'P',
  Р: 'R',
  С: 'S',
  Т: 'T',
  У: 'U',
  Ф: 'F',
  Х: 'H',
  Ц: 'Ts',
  Ч: 'Ch',
  Ш: 'Sh',
  Щ: 'Sch',
  Ъ: '',
  Ы: 'Y',
  Ь: '',
  Э: 'E',
  Ю: 'Yu',
  Я: 'Ya',
};

export function transliterate(text: string): string {
  return text
    .split('')
    .map((char) => TRANSLITERATION_MAP[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

export function generateSku(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${timestamp}${random}`;
}

export function generateSeoTitle(productName: string, categoryName: string): string {
  if (!productName) return '';
  const title = categoryName
    ? `${productName} - ${categoryName} | ${SITE_NAME}`
    : `${productName} | ${SITE_NAME}`;
  return title.substring(0, 70);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export type ProductCardVariantForm = {
  name: string;
  price: string;
  image: string;
  size: string;
  color: string;
  extraOption: string;
  sortOrder: number;
};

export function emptyCardVariant(sortOrder = 0): ProductCardVariantForm {
  return {
    name: '',
    price: '',
    image: '',
    size: '',
    color: '',
    extraOption: '',
    sortOrder,
  };
}

export function generateSeoDescription(productName: string, categoryName: string): string {
  if (!productName) return '';
  const categoryText = categoryName ? ` в категории ${categoryName}` : '';
  const description = `Купить ${productName}${categoryText}. Гарантия качества. ${SITE_NAME}`;
  return description.substring(0, 160);
}
