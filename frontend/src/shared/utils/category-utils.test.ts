import {
  isInteriorDoorsCategory,
  isInteriorDoorsCategoryById,
  isInteriorDoorsProduct,
} from './category-utils';

describe('isInteriorDoorsCategory', () => {
  it('возвращает true для slug "interior-doors"', () => {
    expect(isInteriorDoorsCategory('interior-doors')).toBe(true);
  });

  it('возвращает true для slug "dveri-mezhkomnatnye"', () => {
    expect(isInteriorDoorsCategory('dveri-mezhkomnatnye')).toBe(true);
  });

  it('возвращает true, если родитель — межкомнатные двери', () => {
    expect(isInteriorDoorsCategory('subcategory', 'interior-doors')).toBe(true);
  });

  it('возвращает false для другого slug без родителя', () => {
    expect(isInteriorDoorsCategory('entrance-doors')).toBe(false);
  });
});

describe('isInteriorDoorsProduct', () => {
  it('возвращает true, если категория — межкомнатные двери', () => {
    expect(isInteriorDoorsProduct({ slug: 'interior-doors', parent: null })).toBe(true);
  });

  it('возвращает true, если родитель категории — межкомнатные двери', () => {
    expect(isInteriorDoorsProduct({ slug: 'sub', parent: { slug: 'dveri-mezhkomnatnye' } })).toBe(
      true
    );
  });

  it('возвращает false для другой категории', () => {
    expect(isInteriorDoorsProduct({ slug: 'entrance-doors', parent: null })).toBe(false);
  });
});

describe('isInteriorDoorsCategoryById', () => {
  it('возвращает true, если категория с данным id имеет slug interior-doors', () => {
    const categories = [
      { id: 'cat-1', slug: 'interior-doors', parentId: null },
      { id: 'cat-2', slug: 'other', parentId: null },
    ];
    expect(isInteriorDoorsCategoryById('cat-1', categories)).toBe(true);
  });

  it('возвращает false при пустом списке категорий', () => {
    expect(isInteriorDoorsCategoryById('cat-1', [])).toBe(false);
  });
});
