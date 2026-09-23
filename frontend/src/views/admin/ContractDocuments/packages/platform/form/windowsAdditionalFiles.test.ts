import { PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX, normalizeWindowsAdditionalFiles } from './normalize';

describe('normalizeWindowsAdditionalFiles', () => {
  it('returns an empty array for missing or invalid input', () => {
    expect(normalizeWindowsAdditionalFiles(undefined)).toEqual([]);
    expect(normalizeWindowsAdditionalFiles('nope')).toEqual([]);
    expect(normalizeWindowsAdditionalFiles([null, 1, { fileName: 'no-url.pdf' }])).toEqual([]);
  });

  it('keeps valid entries, trims fields and dedupes by url', () => {
    const files = normalizeWindowsAdditionalFiles([
      {
        fileUrl: '/uploads/contract-document-packages/windows-additional-files/a.pdf',
        fileName: ' КП.pdf ',
        uploadedAt: '2026-09-23T10:00:00.000Z',
        size: 123,
      },
      {
        fileUrl: '/uploads/contract-document-packages/windows-additional-files/a.pdf',
        fileName: 'dup.pdf',
        uploadedAt: '',
        size: 1,
      },
      {
        fileUrl: '/uploads/contract-document-packages/windows-additional-files/b.jpg',
        fileName: '',
      },
    ]);
    expect(files).toHaveLength(2);
    expect(files[0]).toEqual({
      fileUrl: '/uploads/contract-document-packages/windows-additional-files/a.pdf',
      fileName: 'КП.pdf',
      uploadedAt: '2026-09-23T10:00:00.000Z',
      size: 123,
    });
    expect(files[1].size).toBeNull();
  });

  it('caps the list at the maximum', () => {
    const raw = Array.from({ length: PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX + 3 }, (_, i) => ({
      fileUrl: `/uploads/contract-document-packages/windows-additional-files/f${i}.pdf`,
      fileName: `f${i}.pdf`,
      uploadedAt: '',
      size: 1,
    }));
    const files = normalizeWindowsAdditionalFiles(raw);
    expect(files).toHaveLength(PACKAGE_WINDOWS_ADDITIONAL_FILES_MAX);
  });
});
