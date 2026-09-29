import { getCrmCustomers } from '@/shared/api/admin-crm';

/** Ключ сравнения телефонов: только цифры; ведущие «8»/«+7» не различаем. */
export function normalizePhoneMatchKey(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('8') || digits.startsWith('7'))) {
    return digits.slice(1);
  }
  return digits;
}

function meaningfulKeys(phones: string[]): Set<string> {
  return new Set(phones.map(normalizePhoneMatchKey).filter((key) => key.length >= 7));
}

/**
 * Единственная карточка CRM с таким телефоном (точное совпадение любой из строк
 * `phone`/`phones` карточки). Ноль или несколько карточек — null: не найдено
 * или неоднозначно. Ошибка поиска не должна мешать подписанию — тоже null.
 */
export async function resolveUniqueCrmCustomerByPhones(phones: string[]): Promise<string | null> {
  const query = phones.map((p) => p.trim()).filter(Boolean)[0];
  if (!query) return null;
  try {
    const res = await getCrmCustomers({ search: query, limit: 100 });
    const wanted = meaningfulKeys(phones);
    if (wanted.size === 0) return null;
    const matchedIds = [
      ...new Set(
        (res.data ?? [])
          .filter((card) => {
            const cardKeys = meaningfulKeys([card.phone ?? '', ...(card.phones ?? [])]);
            for (const key of cardKeys) {
              if (wanted.has(key)) return true;
            }
            return false;
          })
          .map((card) => card.id)
      ),
    ];
    return matchedIds.length === 1 ? matchedIds[0] : null;
  } catch {
    return null;
  }
}
