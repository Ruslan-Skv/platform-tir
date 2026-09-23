import {
  PACKAGE_SPECIFICATION_VERSIONS_MAX,
  normalizeProductSpecificationVersions,
  syncProductSpecificationLegacyFields,
} from './normalize';

describe('normalizeProductSpecificationVersions', () => {
  it('backfills a single version from legacy fields when the array is absent', () => {
    const versions = normalizeProductSpecificationVersions(
      undefined,
      '/uploads/contract-document-packages/windows-specifications/spec.pdf',
      'Спецификация.pdf'
    );
    expect(versions).toEqual([
      {
        version: 1,
        fileUrl: '/uploads/contract-document-packages/windows-specifications/spec.pdf',
        fileName: 'Спецификация.pdf',
        uploadedAt: '',
        size: null,
      },
    ]);
  });

  it('keeps an empty array when no file was ever attached', () => {
    expect(normalizeProductSpecificationVersions([], '', '')).toEqual([]);
    expect(normalizeProductSpecificationVersions(undefined, '', '')).toEqual([]);
  });

  it('drops entries without a file url, dedupes by url and sorts by version', () => {
    const versions = normalizeProductSpecificationVersions(
      [
        { version: 2, fileUrl: '/uploads/a2.pdf', fileName: 'v2.pdf', uploadedAt: '', size: 20 },
        { version: 3, fileUrl: '/uploads/a3.pdf', fileName: 'v3.pdf', uploadedAt: '', size: 30 },
        { version: 1, fileUrl: '/uploads/a1.pdf', fileName: 'v1.pdf', uploadedAt: '', size: 10 },
        { version: 4, fileUrl: '', fileName: 'broken.pdf', uploadedAt: '', size: 0 },
        { version: 4, fileUrl: '/uploads/a3.pdf', fileName: 'dup.pdf', uploadedAt: '', size: 99 },
      ],
      '',
      ''
    );
    expect(versions.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(versions[2].fileName).toBe('v3.pdf');
  });

  it('caps stored versions at the maximum and assigns fallback numbers', () => {
    const raw = Array.from({ length: 8 }, (_, i) => ({
      version: i + 1,
      fileUrl: `/uploads/v${i + 1}.pdf`,
      fileName: `v${i + 1}.pdf`,
      uploadedAt: '',
      size: 1,
    }));
    const versions = normalizeProductSpecificationVersions(raw, '', '');
    expect(versions).toHaveLength(PACKAGE_SPECIFICATION_VERSIONS_MAX);
    expect(versions.map((v) => v.version)).toEqual([1, 2, 3, 4, 5]);

    const unnumbered = normalizeProductSpecificationVersions(
      [
        { fileUrl: '/uploads/x1.pdf', fileName: 'x1.pdf', uploadedAt: '', size: 1 },
        { fileUrl: '/uploads/x2.pdf', fileName: 'x2.pdf', uploadedAt: '', size: 2 },
      ],
      '',
      ''
    );
    expect(unnumbered.map((v) => v.version)).toEqual([1, 2]);
  });
});

describe('syncProductSpecificationLegacyFields', () => {
  it('points legacy fields at the latest version', () => {
    const versions = normalizeProductSpecificationVersions(
      [
        { version: 1, fileUrl: '/uploads/a1.pdf', fileName: 'v1.pdf', uploadedAt: '', size: 1 },
        { version: 2, fileUrl: '/uploads/a2.pdf', fileName: 'v2.pdf', uploadedAt: '', size: 2 },
      ],
      '',
      ''
    );
    expect(syncProductSpecificationLegacyFields(versions, '', '')).toEqual({
      fileUrl: '/uploads/a2.pdf',
      fileName: 'v2.pdf',
    });
  });

  it('falls back to the legacy file when there are no versions', () => {
    expect(
      syncProductSpecificationLegacyFields([], '/uploads/legacy.pdf', 'Старая спецификация.pdf')
    ).toEqual({ fileUrl: '/uploads/legacy.pdf', fileName: 'Старая спецификация.pdf' });
  });
});
