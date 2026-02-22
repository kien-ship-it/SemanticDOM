import { readdir, stat, readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

/**
 * Reads the most recently modified HTML file from the input directory.
 * @param {string} inputDir - Path to the input directory
 * @returns {Promise<{filePath: string, content: string}>}
 * @throws {Error} If no HTML files found in inputDir
 */
export async function readSourceHTML(inputDir = './input') {
    let entries;
    try {
        entries = await readdir(inputDir);
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`Input directory not found: ${inputDir}`);
        }
        throw err;
    }

    const htmlFiles = entries.filter(f => extname(f).toLowerCase() === '.html');

    if (htmlFiles.length === 0) {
        throw new Error(`No HTML files found in ${inputDir}`);
    }

    // Get modification times for sorting
    const filesWithStats = await Promise.all(
        htmlFiles.map(async (file) => {
            const filePath = join(inputDir, file);
            const fileStat = await stat(filePath);
            return { filePath, mtimeMs: fileStat.mtimeMs };
        })
    );

    // Sort by modification time, most recent first
    filesWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const mostRecent = filesWithStats[0];
    const content = await readFile(mostRecent.filePath, 'utf-8');

    return { filePath: mostRecent.filePath, content };
}
