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

  it('parses VK community video URL', () => {
    const result = parseVideoEmbed('https://vk.com/video-48622702_456239374');
    expect(result).toEqual({
      provider: 'vk',
      embedUrl: 'https://vk.com/video_ext.php?oid=-48622702&id=456239374',
    });
  });

  it('parses VK embed URL with hash', () => {
    const result = parseVideoEmbed(
      'https://vk.com/video_ext.php?oid=-48622702&id=456239374&hash=abc123&hd=2'
    );
    expect(result).toEqual({
      provider: 'vk',
      embedUrl: 'https://vk.com/video_ext.php?oid=-48622702&id=456239374&hash=abc123&hd=2',
    });
  });

  it('parses VK video URL on vkvideo.ru', () => {
    const result = parseVideoEmbed('https://vkvideo.ru/video-48622702_456239374');
    expect(result?.provider).toBe('vk');
    expect(result && 'embedUrl' in result ? result.embedUrl : '').toContain('oid=-48622702');
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

  it('returns true for VK', () => {
    expect(isEmbeddedVideoProvider('https://vk.com/video-48622702_456239374')).toBe(true);
  });
});
