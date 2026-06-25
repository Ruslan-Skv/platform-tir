import { buildKnowledgeCategoryResourceId } from './knowledge-resources.util';
import { isKnowledgeCategoryExplicitlyDenied } from './knowledge-trainee-category-access.util';

describe('isKnowledgeCategoryExplicitlyDenied', () => {
  const categoryId = buildKnowledgeCategoryResourceId('cat-1');

  it('returns false when there are no permissions', () => {
    expect(isKnowledgeCategoryExplicitlyDenied(categoryId, [], [])).toBe(false);
  });

  it('returns true for explicit role DENIED on category', () => {
    expect(
      isKnowledgeCategoryExplicitlyDenied(
        categoryId,
        [],
        [{ resourceId: categoryId, permission: 'DENIED' }],
      ),
    ).toBe(true);
  });

  it('ignores inherited DENIED on parent admin.knowledge', () => {
    expect(
      isKnowledgeCategoryExplicitlyDenied(
        categoryId,
        [],
        [{ resourceId: 'admin.knowledge', permission: 'DENIED' }],
      ),
    ).toBe(false);
  });
});
