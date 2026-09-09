import type { CartItem } from '@/shared/api/cart';

import { doorsSpecificationLineHasContent, newDoorsSpecificationLine } from './doorsSpecification';
import {
  isCartItemRelevantForDoorsSpecification,
  mapCartItemToDoorsSpecificationLine,
  mapCartItemsToDoorsSpecificationLines,
  mergeDoorsSpecificationLines,
  parseCartMoney,
  resolveCartProductColor,
  resolveCartProductUnitPrice,
} from './mapCartItemsToDoorsSpecificationLines';

function baseCartItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'cart-1',
    userId: 'user-1',
    productId: 'prod-1',
    componentId: null,
    cardVariantId: null,
    quantity: 1,
    size: null,
    openingSide: null,
    createdAt: '',
    updatedAt: '',
    product: {
      id: 'prod-1',
      name: 'Входная дверь',
      slug: 'door-1',
      price: 25_000,
      images: [],
      category: { id: 'cat-1', name: 'Входные', slug: 'entrance-doors' },
    },
    component: null,
    ...overrides,
  };
}

describe('mapCartItemsToDoorsSpecificationLines', () => {
  it('maps product with string decimal price from API', () => {
    const item = baseCartItem({
      product: {
        ...baseCartItem().product!,
        price: '32500.50' as unknown as number,
      },
    });
    const line = mapCartItemToDoorsSpecificationLine(item);
    expect(line?.unitPrice).toBe('32\u00a0500,50');
    expect(resolveCartProductUnitPrice(item)).toBe(32_500.5);
  });

  it('maps product color from coating material', () => {
    const item = baseCartItem({
      product: {
        ...baseCartItem().product!,
        coatingMaterial: { id: 'cm-1', name: 'Венге', slug: 'venge' },
      },
    });
    expect(resolveCartProductColor(item)).toBe('Венге');
    const line = mapCartItemToDoorsSpecificationLine(item);
    expect(line?.color).toBe('Венге');
  });

  it('maps product color from attributes record', () => {
    const item = baseCartItem({
      product: {
        ...baseCartItem().product!,
        attributes: { 'coating-material': 'Белый матовый' },
      },
    });
    expect(resolveCartProductColor(item)).toBe('Белый матовый');
  });

  it('parseCartMoney handles strings and numbers', () => {
    expect(parseCartMoney('12 500,75')).toBe(12_500.75);
    expect(parseCartMoney(18000)).toBe(18_000);
  });

  it('maps product with size and opening side', () => {
    const item = baseCartItem({
      size: '900×2100',
      openingSide: 'Правая',
      quantity: 2,
    });
    const line = mapCartItemToDoorsSpecificationLine(item);
    expect(line?.name).toBe('Входная дверь');
    expect(line?.size).toBe('900×2100');
    expect(line?.openingSide).toBe('Правая');
    expect(line?.quantity).toBe('2');
    expect(line?.unitPrice).toBe('25\u00a0000,00');
  });

  it('maps product in entrance-doors subcategory', () => {
    const item = baseCartItem({
      product: {
        ...baseCartItem().product!,
        category: { id: 'cat-sub', name: 'M', slug: 'entrance-doors-m' },
      },
    });
    expect(isCartItemRelevantForDoorsSpecification(item)).toBe(true);
    const line = mapCartItemToDoorsSpecificationLine(item);
    expect(line?.name).toBe('Входная дверь');
  });

  it('maps product with card variant color and price', () => {
    const item = baseCartItem({
      cardVariant: {
        id: 'v1',
        name: 'Белый матовый',
        price: 18_500,
        size: '800×2000',
        color: 'Белый',
      },
      product: {
        ...baseCartItem().product!,
        name: 'Межкомнатная дверь',
        category: { id: 'cat-2', name: 'Межкомнатные', slug: 'interior-doors' },
      },
    });
    const line = mapCartItemToDoorsSpecificationLine(item);
    expect(line?.name).toContain('Межкомнатная дверь');
    expect(line?.color).toBe('Белый');
    expect(line?.size).toBe('800×2000');
    expect(line?.unitPrice).toBe('18\u00a0500,00');
  });

  it('maps component line with name and parent product', () => {
    const item = baseCartItem({
      productId: null,
      product: null,
      componentId: 'comp-1',
      component: {
        id: 'comp-1',
        name: 'Наличник',
        type: 'Наличник телескопический',
        price: 1_200,
        product: { id: 'prod-1', name: 'Межкомнатная дверь', slug: 'door' },
      },
    });
    const line = mapCartItemToDoorsSpecificationLine(item);
    expect(line?.name).toContain('Наличник');
    expect(line?.name).toContain('Межкомнатная дверь');
    expect(line?.unitPrice).toBe('1\u00a0200,00');
  });

  it('maps any catalog product regardless of category', () => {
    const item = baseCartItem({
      product: {
        ...baseCartItem().product!,
        name: 'Окно ПВХ',
        category: { id: 'cat-x', name: 'Окна', slug: 'windows' },
      },
    });
    expect(isCartItemRelevantForDoorsSpecification(item)).toBe(true);
    const { lines, importedCount } = mapCartItemsToDoorsSpecificationLines([item]);
    expect(lines).toHaveLength(1);
    expect(importedCount).toBe(1);
    expect(lines[0]?.name).toBe('Окно ПВХ');
  });

  it('skips cart rows without product or component data', () => {
    const item = baseCartItem({
      productId: 'prod-1',
      product: null,
    });
    expect(isCartItemRelevantForDoorsSpecification(item)).toBe(false);
    const { lines, importedCount, skippedCount } = mapCartItemsToDoorsSpecificationLines([item]);
    expect(lines).toHaveLength(0);
    expect(importedCount).toBe(0);
    expect(skippedCount).toBe(1);
  });

  it('merge replace replaces all lines', () => {
    const existing = [{ ...newDoorsSpecificationLine(), name: 'Старая' }];
    const imported = [{ ...newDoorsSpecificationLine(), name: 'Новая' }];
    const merged = mergeDoorsSpecificationLines(existing, imported, 'replace');
    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe('Новая');
  });

  it('merge append keeps filled lines and adds imported', () => {
    const existing = [{ ...newDoorsSpecificationLine(), name: 'Старая' }];
    const imported = [{ ...newDoorsSpecificationLine(), name: 'Новая' }];
    const merged = mergeDoorsSpecificationLines(existing, imported, 'append');
    expect(merged).toHaveLength(2);
    expect(merged.map((l) => l.name)).toEqual(['Старая', 'Новая']);
  });

  it('merge append drops empty placeholder rows', () => {
    const existing = [
      newDoorsSpecificationLine(),
      { ...newDoorsSpecificationLine(), name: 'Есть' },
    ];
    const imported = [{ ...newDoorsSpecificationLine(), name: 'Из корзины' }];
    const merged = mergeDoorsSpecificationLines(existing, imported, 'append');
    expect(merged).toHaveLength(2);
    expect(merged.every(doorsSpecificationLineHasContent)).toBe(true);
  });
});
