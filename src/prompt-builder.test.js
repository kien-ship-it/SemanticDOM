import { describe, it, expect } from 'vitest';
import { buildPrompt } from './prompt-builder.js';

describe('buildPrompt', () => {
    const sampleHTML = '<div class="post"><h2 class="title">Hello</h2></div>';
    const sampleDescription = 'select all post titles';

    it('returns an object with systemPrompt and userPrompt', () => {
        const result = buildPrompt(sampleHTML, sampleDescription);
        expect(result).toHaveProperty('systemPrompt');
        expect(result).toHaveProperty('userPrompt');
        expect(typeof result.systemPrompt).toBe('string');
        expect(typeof result.userPrompt).toBe('string');
    });

    it('system prompt instructs LLM to act as DOM analysis expert', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(systemPrompt).toContain('DOM analysis expert');
    });

    it('system prompt instructs JSON format with selectors array', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(systemPrompt).toContain('{ "selectors":');
        expect(systemPrompt).toContain('JSON');
    });

    it('system prompt instructs to prefer specific selectors over generic ones', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(systemPrompt).toMatch(/specific selector/i);
        expect(systemPrompt).toMatch(/div|span/);
    });

    it('system prompt instructs to return multiple selectors when appropriate', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(systemPrompt).toMatch(/multiple selectors/i);
    });

    it('user prompt contains the HTML content', () => {
        const { userPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(userPrompt).toContain(sampleHTML);
    });

    it('user prompt contains the description', () => {
        const { userPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(userPrompt).toContain(sampleDescription);
    });

    it('does not include distilled instruction when isDistilled is false', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription, { isDistilled: false });
        expect(systemPrompt).not.toContain('simplified skeleton');
        expect(systemPrompt).not.toContain('original full HTML');
    });

    it('does not include distilled instruction by default', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription);
        expect(systemPrompt).not.toContain('simplified skeleton');
    });

    it('includes distilled instruction when isDistilled is true', () => {
        const { systemPrompt } = buildPrompt(sampleHTML, sampleDescription, { isDistilled: true });
        expect(systemPrompt).toContain('simplified skeleton');
        expect(systemPrompt).toContain('original full HTML document');
    });

    it('works with empty HTML string', () => {
        const { userPrompt } = buildPrompt('', sampleDescription);
        expect(userPrompt).toContain(sampleDescription);
    });

    it('works with large HTML content', () => {
        const largeHTML = '<div>'.repeat(1000) + '</div>'.repeat(1000);
        const { userPrompt } = buildPrompt(largeHTML, 'find divs');
        expect(userPrompt).toContain(largeHTML);
    });
});
