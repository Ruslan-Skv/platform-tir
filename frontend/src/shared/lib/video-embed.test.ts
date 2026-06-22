import { isEmbeddedVideoProvider, isNativeVideoFileUrl, parseVideoEmbed } from './video-embed';

describe('parseVideoEmbed', () => {
  it('parses Rutube watch URL', () => {
    const result = parseVideoEmbed('https://rutube.ru/video/6b111aab772dbd7c3fd8f7b40ecfbc64/');
    expect(result).toEqual({
      provider: 'rutube',
      embedUrl: 'https://rutube.ru/play/embed/6b111aab772dbd7c3fd8f7b40ecfbc64',
    });
  });

  it('parses Rutube embed URL', () => {
    const result = parseVideoEmbed('https://rutube.ru/play/embed/6b111aab772dbd7c3fd8f7b40ecfbc64');
    expect(result?.provider).toBe('rutube');
  });

  it('parses YouTube URL', () => {
    const result = parseVideoEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toEqual({
      provider: 'youtube',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0',
    });
  });

  it('treats direct mp4 as native', () => {
    const result = parseVideoEmbed('https://cdn.example.com/clip.mp4');
    expect(result).toEqual({
      provider: 'native',
      nativeUrl: 'https://cdn.example.com/clip.mp4',
    });
  });
});

describe('isNativeVideoFileUrl', () => {
  it('returns false for Rutube', () => {
    expect(isNativeVideoFileUrl('https://rutube.ru/video/6b111aab772dbd7c3fd8f7b40ecfbc64/')).toBe(
      false
    );
  });

  it('returns true for mp4', () => {
    expect(isNativeVideoFileUrl('https://cdn.example.com/clip.mp4')).toBe(true);
  });
});

describe('isEmbeddedVideoProvider', () => {
  it('returns true for Rutube', () => {
    expect(
      isEmbeddedVideoProvider('https://rutube.ru/video/6b111aab772dbd7c3fd8f7b40ecfbc64/')
    ).toBe(true);
  });
});
