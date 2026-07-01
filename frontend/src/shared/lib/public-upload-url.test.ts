import { normalizeUploadsInUrl, publicUploadUrl } from './public-upload-url';

describe('normalizeUploadsInUrl', () => {
  it('убирает хост и /api/v1 перед /uploads/', () => {
    expect(normalizeUploadsInUrl('http://localhost:3001/uploads/hero/x.jpg')).toBe(
      '/uploads/hero/x.jpg'
    );
    expect(normalizeUploadsInUrl('https://example.com/api/v1/uploads/badges/x.png')).toBe(
      '/uploads/badges/x.png'
    );
    expect(normalizeUploadsInUrl('/api/v1/uploads/avatars/a.jpg')).toBe('/uploads/avatars/a.jpg');
  });
});

describe('publicUploadUrl', () => {
  it('возвращает относительный путь для uploads с любого хоста', () => {
    expect(publicUploadUrl('http://localhost:3001/uploads/hero/hero-1.jpg')).toBe(
      '/uploads/hero/hero-1.jpg'
    );
    expect(publicUploadUrl('/uploads/hero/hero-1.jpg')).toBe('/uploads/hero/hero-1.jpg');
  });

  it('оставляет внешние URL без /uploads/', () => {
    expect(publicUploadUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
  });

  it('нормализует пути из public', () => {
    expect(publicUploadUrl('/images/dark-fon.jpg')).toBe('/images/dark-fon.jpg');
    expect(publicUploadUrl('images/dark-fon.jpg')).toBe('/images/dark-fon.jpg');
  });
});
