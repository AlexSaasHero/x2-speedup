// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { extractChannel, isYouTubeHost } from '../../src/content/youtube';
import { isAdShowing } from '../../src/pro/youtube-ads';
import { isSafeSource } from '../../src/pro/skip-silence';

const doc = (html: string) => {
  const d = document.implementation.createHTMLDocument('t');
  d.body.innerHTML = html;
  return d;
};

describe('YouTube channel extraction', () => {
  it('reads the owner link on watch pages (handle + name)', () => {
    const d = doc('<ytd-watch-metadata><ytd-channel-name><a href="/@veritasium">Veritasium</a></ytd-channel-name></ytd-watch-metadata>');
    expect(extractChannel(d, 'https://www.youtube.com/watch?v=abc')).toEqual({ handle: '@veritasium', name: 'Veritasium' });
  });

  it('reads /channel/ID links', () => {
    const d = doc('<div id="upload-info"><ytd-channel-name><a href="https://www.youtube.com/channel/UCabcdefghijklmnop">Name</a></ytd-channel-name></div>');
    expect(extractChannel(d, 'https://www.youtube.com/watch?v=abc')).toEqual({ id: 'UCabcdefghijklmnop', name: 'Name' });
  });

  it('uses the URL on channel pages', () => {
    expect(extractChannel(doc(''), 'https://www.youtube.com/@mkbhd/videos')).toEqual({ handle: '@mkbhd' });
  });

  it('falls back to microdata only when it describes the current video', () => {
    const md = (vid: string) =>
      doc(`<meta itemprop="identifier" content="${vid}"><meta itemprop="channelId" content="UC1234567890ab"><span itemprop="author"><link itemprop="name" content="Chan"></span>`);
    expect(extractChannel(md('abc'), 'https://www.youtube.com/watch?v=abc')).toEqual({ id: 'UC1234567890ab', name: 'Chan' });
    expect(extractChannel(md('old'), 'https://www.youtube.com/watch?v=abc')).toBeNull();
  });

  it('returns null when nothing is found or not YouTube', () => {
    expect(extractChannel(doc('<div>no channel</div>'), 'https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(extractChannel(doc('<ytd-channel-name><a href="/@x">x</a></ytd-channel-name>'), 'https://vimeo.com/1')).toBeNull();
    expect(isYouTubeHost('m.youtube.com')).toBe(true);
    expect(isYouTubeHost('notyoutube.com')).toBe(false);
  });
});

describe('YouTube ads detection', () => {
  it('only the player classes count', () => {
    const p = document.createElement('div');
    p.className = 'html5-video-player playing-mode';
    expect(isAdShowing(p)).toBe(false);
    p.classList.add('ad-showing');
    expect(isAdShowing(p)).toBe(true);
    p.className = 'html5-video-player ad-interrupting';
    expect(isAdShowing(p)).toBe(true);
  });
});

describe('skip silence source safety', () => {
  const page = 'https://www.example.com';
  it('allows same-origin, blob/data/MSE and CORS-mode media', () => {
    expect(isSafeSource('blob:https://www.example.com/1-2', page, null)).toBe(true);
    expect(isSafeSource('https://www.example.com/v.mp4', page, null)).toBe(true);
    expect(isSafeSource('/v.mp4', page, null)).toBe(true);
    expect(isSafeSource('https://cdn.other.com/v.mp4', page, 'anonymous')).toBe(true);
  });
  it('refuses cross-origin media without CORS (would be silenced)', () => {
    expect(isSafeSource('https://cdn.other.com/v.mp4', page, null)).toBe(false);
    expect(isSafeSource('', page, null)).toBe(false);
  });
});
