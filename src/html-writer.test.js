import { describe, it, expect, afterEach } from 'vitest';
import { writeOutputHTML } from './html-writer.js';
import { readFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { existsSync } from 'node:fs';

const TEST_DIR = './test-output-tmp';

afterEach(async () => {
    if (existsSync(TEST_DIR)) {
        await rm(TEST_DIR, { recursive: true, force: true });
    }
});

describe('writeOutputHTML', () => {
    it('creates the output directory if it does not exist', async () => {
        const outputPath = join(TEST_DIR, 'index.html');
        await writeOutputHTML('<h1>Hello</h1>', outputPath);
        expect(existsSync(TEST_DIR)).toBe(true);
    });

    it('writes the HTML content to the file', async () => {
        const html = '<!DOCTYPE html><html><body><p>Test</p></body></html>';
        const outputPath = join(TEST_DIR, 'index.html');
        await writeOutputHTML(html, outputPath);
        const content = await readFile(outputPath, 'utf-8');
        expect(content).toBe(html);
    });

    it('returns the absolute path of the written file', async () => {
        const outputPath = join(TEST_DIR, 'index.html');
        const result = await writeOutputHTML('<p>hi</p>', outputPath);
        expect(result).toBe(resolve(outputPath));
    });

    it('overwrites an existing file', async () => {
        const outputPath = join(TEST_DIR, 'index.html');
        await writeOutputHTML('<p>first</p>', outputPath);
        await writeOutputHTML('<p>second</p>', outputPath);
        const content = await readFile(outputPath, 'utf-8');
        expect(content).toBe('<p>second</p>');
    });

    it('creates nested directories as needed', async () => {
        const outputPath = join(TEST_DIR, 'deep', 'nested', 'dir', 'index.html');
        await writeOutputHTML('<div></div>', outputPath);
        const content = await readFile(outputPath, 'utf-8');
        expect(content).toBe('<div></div>');
    });
});
