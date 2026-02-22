import { describe, it, expect, vi } from 'vitest';
import { parseSelectorsFromResponse, validateSelectors } from './selector-parser.js';

describe('parseSelectorsFromResponse', () => {
    it('parses valid JSON with selectors array', () => {
        const input = '{ "selectors": ["div.post", "article h3"] }';
        const result = parseSelectorsFromResponse(input);
        expect(result).toEqual({ selectors: ['div.post', 'article h3'] });
    });

    it('parses JSON wrapped in markdown code fences', () => {
        const input = '```json\n{ "selectors": [".title"] }\n```';
        const result = parseSelectorsFromResponse(input);
        expect(result).toEqual({ selectors: ['.title'] });
    });

    it('parses JSON wrapped in plain code fences', () => {
        const input = '```\n{ "selectors": [".card"] }\n```';
        const result = parseSelectorsFromResponse(input);
        expect(result).toEqual({ selectors: ['.card'] });
    });

    it('extracts JSON surrounded by extra text', () => {
        const input = 'Here are the selectors:\n{ "selectors": ["#main"] }\nHope that helps!';
        const result = parseSelectorsFromResponse(input);
        expect(result).toEqual({ selectors: ['#main'] });
    });

    it('returns null for plain text with no JSON', () => {
        expect(parseSelectorsFromResponse('I could not find any elements')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(parseSelectorsFromResponse('')).toBeNull();
    });

    it('returns null for non-string input', () => {
        expect(parseSelectorsFromResponse(null)).toBeNull();
        expect(parseSelectorsFromResponse(undefined)).toBeNull();
        expect(parseSelectorsFromResponse(42)).toBeNull();
    });

    it('returns null when selectors is not an array', () => {
        const input = '{ "selectors": "div.post" }';
        expect(parseSelectorsFromResponse(input)).toBeNull();
    });

    it('returns null when selectors array contains non-strings', () => {
        const input = '{ "selectors": [123, true] }';
        expect(parseSelectorsFromResponse(input)).toBeNull();
    });

    it('returns null when selectors array contains empty strings', () => {
        const input = '{ "selectors": ["", "  "] }';
        expect(parseSelectorsFromResponse(input)).toBeNull();
    });

    it('returns null for JSON missing selectors key', () => {
        const input = '{ "results": [".post"] }';
        expect(parseSelectorsFromResponse(input)).toBeNull();
    });

    it('returns null for malformed JSON', () => {
        expect(parseSelectorsFromResponse('{ selectors: [.post] }')).toBeNull();
    });
});

const sampleHTML = `
<html>
<body>
  <div class="feed">
    <article class="post" id="p1">
      <h3 class="title">First Post</h3>
      <p>Content here</p>
    </article>
    <article class="post" id="p2">
      <h3 class="title">Second Post</h3>
      <p>More content</p>
    </article>
  </div>
  <footer><p>Footer text</p></footer>
</body>
</html>
`;

describe('validateSelectors', () => {
    it('returns selectors that match elements with correct counts', () => {
        const result = validateSelectors(['article.post', 'h3.title'], sampleHTML);
        expect(result).toEqual([
            { selector: 'article.post', matchCount: 2 },
            { selector: 'h3.title', matchCount: 2 },
        ]);
    });

    it('excludes selectors that match zero elements', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const result = validateSelectors(['.nonexistent', 'h3.title'], sampleHTML);
        expect(result).toEqual([{ selector: 'h3.title', matchCount: 2 }]);
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('.nonexistent')
        );
        warnSpy.mockRestore();
    });

    it('returns empty array when all selectors match nothing', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const result = validateSelectors(['.nope', '#zilch'], sampleHTML);
        expect(result).toEqual([]);
        expect(warnSpy).toHaveBeenCalledTimes(2);
        warnSpy.mockRestore();
    });

    it('handles invalid CSS selectors gracefully', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        const result = validateSelectors(['[invalid==='], sampleHTML);
        expect(result).toEqual([]);
        expect(warnSpy).toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('returns correct count for id selectors', () => {
        const result = validateSelectors(['#p1'], sampleHTML);
        expect(result).toEqual([{ selector: '#p1', matchCount: 1 }]);
    });

    it('handles empty selectors array', () => {
        const result = validateSelectors([], sampleHTML);
        expect(result).toEqual([]);
    });
});
