import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Write modified HTML content to the output file.
 *
 * @param {string} html - Modified HTML content
 * @param {string} outputPath - Output file path (default: './output/index.html')
 * @returns {Promise<string>} The absolute path of the written file
 */
export async function writeOutputHTML(html, outputPath = './output/index.html') {
    const absolutePath = resolve(outputPath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, html, 'utf-8');
    return absolutePath;
}
