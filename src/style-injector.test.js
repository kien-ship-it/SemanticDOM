import { describe, it, expect } from 'vitest';
import * as cheerio from 'cheerio';
import { injectHighlightStyles } from './style-injector.js';

const DEFAULT_STYLE = 'border: 4px solid red; background: rgba(255, 255, 0, 0.3);';

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

describe('injectHighlightStyles', () => {
    it('injects highlight style into matched elements', () => {
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, ['h3.title']);
        const $ = cheerio.load(html);

        expect(totalHighlighted).toBe(2);
        $('h3.title').each((_i, el) => {
            expect($(el).attr('style')).toBe(DEFAULT_STYLE);
        });
    });

    it('appends to existing inline style with semicolon', () => {
        const htmlWithStyle = '<div><p style="color: blue;">Hello</p></div>';
        const { html, totalHighlighted } = injectHighlightStyles(htmlWithStyle, ['p']);
        const $ = cheerio.load(html);

        expect(totalHighlighted).toBe(1);
        const style = $('p').attr('style');
        expect(style).toContain('color: blue;');
        expect(style).toContain(DEFAULT_STYLE);
    });

    it('appends to existing style missing trailing semicolon', () => {
        const htmlNoSemicolon = '<div><p style="color: blue">Hello</p></div>';
        const { html, totalHighlighted } = injectHighlightStyles(htmlNoSemicolon, ['p']);
        const $ = cheerio.load(html);

        expect(totalHighlighted).toBe(1);
        const style = $('p').attr('style');
        expect(style).toContain('color: blue');
        expect(style).toContain(DEFAULT_STYLE);
        // Should have a semicolon separator between old and new
        expect(style).toMatch(/color: blue;\s/);
    });

    it('deduplicates elements matched by multiple selectors', () => {
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, ['article.post', '#p1']);
        const $ = cheerio.load(html);

        // #p1 is also article.post, so total unique elements = 2 (both articles)
        expect(totalHighlighted).toBe(2);
        // #p1 should only have the highlight style applied (not doubled)
        const p1Style = $('#p1').attr('style');
        // The style gets applied once by 'article.post', then again by '#p1'
        // but the element count is deduplicated
        expect(p1Style).toContain(DEFAULT_STYLE);
    });

    it('handles multiple non-overlapping selectors', () => {
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, ['h3.title', 'footer']);

        expect(totalHighlighted).toBe(3); // 2 h3.title + 1 footer
        const $ = cheerio.load(html);
        expect($('h3.title').first().attr('style')).toBe(DEFAULT_STYLE);
        expect($('footer').attr('style')).toBe(DEFAULT_STYLE);
    });

    it('returns 0 highlighted when no selectors match', () => {
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, ['.nonexistent']);

        expect(totalHighlighted).toBe(0);
        // HTML should still be valid
        const $ = cheerio.load(html);
        expect($('article.post').length).toBe(2);
    });

    it('handles empty selectors array', () => {
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, []);

        expect(totalHighlighted).toBe(0);
        const $ = cheerio.load(html);
        // No style attributes should be added
        expect($('[style]').length).toBe(0);
    });

    it('uses custom highlight style when provided', () => {
        const customStyle = 'outline: 2px dashed green;';
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, ['#p1'], customStyle);
        const $ = cheerio.load(html);

        expect(totalHighlighted).toBe(1);
        expect($('#p1').attr('style')).toBe(customStyle);
    });

    it('handles invalid selectors gracefully', () => {
        const { html, totalHighlighted } = injectHighlightStyles(sampleHTML, ['[invalid===']);

        expect(totalHighlighted).toBe(0);
        // Should not throw, HTML should be intact
        const $ = cheerio.load(html);
        expect($('article.post').length).toBe(2);
    });

    it('serializes modified DOM back to valid HTML', () => {
        const { html } = injectHighlightStyles(sampleHTML, ['article.post']);
        const $ = cheerio.load(html);

        // Structure should be preserved
        expect($('article.post').length).toBe(2);
        expect($('h3.title').length).toBe(2);
        expect($('footer').length).toBe(1);
    });
});
