import { describe, expect, it } from 'vitest';
import { LECTURE_PLATFORMS, lecturePlatform, quirksFor } from '../../src/content/quirks';

describe('lecture platforms', () => {
  it('recognises Panopto and Echo360 hosts, subdomains included', () => {
    for (const h of ['howtovideos.hosted.panopto.com', 'uni.cloud.panopto.eu', 'PANOPTO.COM']) expect(lecturePlatform(h)).toBe('panopto');
    for (const h of ['echo360.org', 'content.echo360.org', 'echo360.org.uk', 'echo360.org.au', 'echo360.ca', 'echo360.net.au', 'www.echo360.com']) {
      expect(lecturePlatform(h)).toBe('echo360');
    }
  });

  it('does not match look-alike or unrelated hosts', () => {
    for (const h of ['notpanopto.com', 'panopto.com.evil.example', 'myecho360.org', 'echo360.org.evil.example', 'youtube.com', 'localhost', '']) {
      expect(lecturePlatform(h)).toBeNull();
    }
  });

  it('forces the speed on every stream only on lecture platforms', () => {
    expect(quirksFor('utexas.hosted.panopto.com').allStreams).toBe(true);
    expect(quirksFor('echo360.org').allStreams).toBe(true);
    expect(quirksFor('www.youtube.com').allStreams).toBe(false);
    expect(quirksFor('www.netflix.com')).toMatchObject({ noDirectSeek: true, allStreams: false, platform: null });
  });

  it('keeps one list per platform', () => {
    expect(Object.keys(LECTURE_PLATFORMS).sort()).toEqual(['echo360', 'panopto']);
  });
});
