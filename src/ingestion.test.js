import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readSourceHTML } from './ingestion.js';
import { mkdir, writeFile, rm, utimes } from 'node:fs/promises';
import { join } from 'node:path';

const TEST_DIR = join('SemanticDOM', 'test_input_ingestion');

describe('readSourceHTML', () => {
    beforeEach(async () => {
        await mkdir(TEST_DIR, { recursive: true });
    });

    afterEach(async () => {
        await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('throws descriptive error when directory does not exist', async () => {
        await expect(readSourceHTML('nonexistent_dir_xyz'))
            .rejects.toThrow('Input directory not found: nonexistent_dir_xyz');
    });

    it('throws descriptive error when directory has no HTML files', async () => {
        await writeFile(join(TEST_DIR, 'readme.txt'), 'not html');
        await expect(readSourceHTML(TEST_DIR))
            .rejects.toThrow(`No HTML files found in ${TEST_DIR}`);
    });

    it('reads a single HTML file correctly', async () => {
        const htmlContent = '<html><body><h1>Hello</h1></body></html>';
        await writeFile(join(TEST_DIR, 'page.html'), htmlContent);

        const result = await readSourceHTML(TEST_DIR);
        expect(result.filePath).toBe(join(TEST_DIR, 'page.html'));
        expect(result.content).toBe(htmlContent);
    });

    it('returns the most recently modified file when multiple exist', async () => {
        const oldContent = '<html><body>Old</body></html>';
        const newContent = '<html><body>New</body></html>';

        await writeFile(join(TEST_DIR, 'old.html'), oldContent);
        // Set old.html to a past timestamp
        const pastTime = new Date(Date.now() - 10000);
        await utimes(join(TEST_DIR, 'old.html'), pastTime, pastTime);

        await writeFile(join(TEST_DIR, 'new.html'), newContent);

        const result = await readSourceHTML(TEST_DIR);
        expect(result.filePath).toBe(join(TEST_DIR, 'new.html'));
        expect(result.content).toBe(newContent);
    });

    it('reads file content as UTF-8', async () => {
        const utf8Content = '<html><body>Ünïcödé — ñ — 日本語</body></html>';
        await writeFile(join(TEST_DIR, 'utf8.html'), utf8Content, 'utf-8');

        const result = await readSourceHTML(TEST_DIR);
        expect(result.content).toBe(utf8Content);
    });

    it('ignores non-html files', async () => {
        await writeFile(join(TEST_DIR, 'data.json'), '{}');
        await writeFile(join(TEST_DIR, 'page.html'), '<html></html>');

        const result = await readSourceHTML(TEST_DIR);
        expect(result.filePath).toBe(join(TEST_DIR, 'page.html'));
    });

    it('handles .HTML extension case-insensitively', async () => {
        await writeFile(join(TEST_DIR, 'PAGE.HTML'), '<html>upper</html>');

        const result = await readSourceHTML(TEST_DIR);
        expect(result.content).toBe('<html>upper</html>');
    });
});
