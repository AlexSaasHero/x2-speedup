import { describe, expect, it } from 'vitest';
import { normalizeMediaUrl } from '../../src/shared/url';

describe('normalizeMediaUrl', () => {
  it('collapses YouTube variants to the video id', () => {
    const key = 'youtube.com/watch?v=abc';
    expect(normalizeMediaUrl('https://www.youtube.com/watch?v=abc&t=42s&list=PL1&si=xyz')).toBe(key);
    expect(normalizeMediaUrl('https://m.youtube.com/watch?feature=share&v=abc')).toBe(key);
    expect(normalizeMediaUrl('https://youtu.be/abc?t=10')).toBe(key);
    expect(normalizeMediaUrl('https://www.youtube.com/shorts/xyz?feature=share')).toBe('youtube.com/shorts/xyz');
  });

  it('drops tracking and timestamp params, hash and www; sorts the rest', () => {
    expect(normalizeMediaUrl('https://www.udemy.com/course/js/learn/lecture/7?utm_source=a&b=2&a=1&fbclid=z#overview')).toBe(
      'udemy.com/course/js/learn/lecture/7?a=1&b=2'
    );
    expect(normalizeMediaUrl('https://vimeo.com/123/')).toBe('vimeo.com/123');
    expect(normalizeMediaUrl('http://localhost:8080/v?t=3')).toBe('localhost:8080/v');
  });

  it('is stable for invalid input', () => {
    expect(normalizeMediaUrl('not a url#x')).toBe('not a url');
  });
});
