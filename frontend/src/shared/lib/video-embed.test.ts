import {
  getNativeVideoPosterSrc,
  getRutubeThumbnailUrl,
  getSyncVideoThumbnailUrl,
  getYoutubeThumbnailUrl,
  isEmbeddedVideoProvider,
  isNativeVideoFileUrl,
  needsAsyncVideoThumbnail,
  parseVideoEmbed,
} from './video-embed';

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

describe('getYoutubeThumbnailUrl', () => {
  it('returns hqdefault for watch URL', () => {
    expect(getYoutubeThumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
  });

  it('returns null for non-YouTube', () => {
    expect(getYoutubeThumbnailUrl('https://cdn.example.com/clip.mp4')).toBeNull();
  });
});

describe('getRutubeThumbnailUrl', () => {
  it('builds CDN preview URL', () => {
    expect(getRutubeThumbnailUrl('https://rutube.ru/video/6b111aab772dbd7c3fd8f7b40ecfbc64/')).toBe(
      'https://pic.rutubelist.ru/video/6b/11/6b111aab772dbd7c3fd8f7b40ecfbc64.jpg'
    );
  });
});

describe('getSyncVideoThumbnailUrl', () => {
  it('returns YouTube sync preview', () => {
    expect(getSyncVideoThumbnailUrl('https://youtu.be/dQw4w9WgXcQ')).toContain('ytimg.com');
  });

  it('does not sync-resolve Rutube (async API)', () => {
    expect(
      getSyncVideoThumbnailUrl('https://rutube.ru/play/embed/6b111aab772dbd7c3fd8f7b40ecfbc64')
    ).toBeNull();
  });
});

describe('needsAsyncVideoThumbnail', () => {
  it('is true for Rutube and Vimeo', () => {
    expect(
      needsAsyncVideoThumbnail('https://rutube.ru/video/6b111aab772dbd7c3fd8f7b40ecfbc64/')
    ).toBe(true);
    expect(needsAsyncVideoThumbnail('https://vimeo.com/76979871')).toBe(true);
  });

  it('is false for YouTube and VK', () => {
    expect(needsAsyncVideoThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
    expect(needsAsyncVideoThumbnail('https://vk.com/video-48622702_456239374')).toBe(false);
  });
});

describe('getNativeVideoPosterSrc', () => {
  it('returns mp4 url without media fragment', () => {
    expect(getNativeVideoPosterSrc('https://cdn.example.com/clip.mp4')).toBe(
      'https://cdn.example.com/clip.mp4'
    );
  });

  it('returns null for YouTube', () => {
    expect(getNativeVideoPosterSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});
