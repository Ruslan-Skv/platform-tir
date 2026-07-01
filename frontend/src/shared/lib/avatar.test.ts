import { getAvatarUrl, getInitials } from './avatar';

describe('getAvatarUrl', () => {
  it('возвращает null для null, undefined и пустой строки', () => {
    expect(getAvatarUrl(null)).toBeNull();
    expect(getAvatarUrl(undefined)).toBeNull();
    expect(getAvatarUrl('')).toBeNull();
    expect(getAvatarUrl('   ')).toBeNull();
  });

  it('возвращает data URL как есть', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    expect(getAvatarUrl(dataUrl)).toBe(dataUrl);
  });

  it('возвращает http/https URL как есть', () => {
    expect(getAvatarUrl('https://example.com/avatar.jpg')).toBe('https://example.com/avatar.jpg');
    expect(getAvatarUrl('http://example.com/avatar.jpg')).toBe('http://example.com/avatar.jpg');
  });

  it('возвращает относительный путь для uploads', () => {
    expect(getAvatarUrl('/uploads/avatars/x.jpg')).toBe('/uploads/avatars/x.jpg');
    expect(getAvatarUrl('uploads/avatars/x.jpg')).toBe('/uploads/avatars/x.jpg');
  });

  it('нормализует абсолютный URL uploads в относительный путь', () => {
    expect(getAvatarUrl('http://localhost:3001/uploads/avatars/x.jpg')).toBe(
      '/uploads/avatars/x.jpg'
    );
  });
});

describe('getInitials', () => {
  it('возвращает инициалы из имени и фамилии', () => {
    expect(getInitials('Иван', 'Петров', '')).toBe('ИП');
    expect(getInitials('John', 'Doe', '')).toBe('JD');
  });

  it('возвращает первые 2 буквы имени, если нет фамилии', () => {
    expect(getInitials('Иван', null, '')).toBe('ИВ');
    expect(getInitials('John', undefined, '')).toBe('JO');
  });

  it('возвращает первые 2 буквы email в верхнем регистре, если нет имени', () => {
    expect(getInitials(null, null, 'user@test.com')).toBe('US');
    expect(getInitials(undefined, undefined, 'admin@example.org')).toBe('AD');
  });

  it('возвращает "?" при пустых данных', () => {
    expect(getInitials(null, null, '')).toBe('?');
  });
});
