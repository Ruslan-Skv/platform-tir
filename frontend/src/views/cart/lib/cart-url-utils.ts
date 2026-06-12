/** Строка preset для URL: itemId1:qty1,itemId2:qty2 */
export function buildPresetQuery(items: Array<{ itemId: string; quantity: number }>): string {
  return items.map((i) => `${i.itemId}:${i.quantity}`).join(',');
}

export function encodeBase64(value: string): string {
  const utf8 = encodeURIComponent(value);
  return btoa(utf8);
}

export function buildRoomsParam(
  rooms: Array<{ name: string; items: { itemId: string; quantity: number }[] }>
): string {
  return encodeBase64(JSON.stringify(rooms));
}
