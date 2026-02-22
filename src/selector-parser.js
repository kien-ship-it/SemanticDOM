import * as cheerio from 'cheerio';

/**
 * Extract JSON from an LLM response string.
 * Handles markdown code fences, extra text around JSON, etc.
 * @param {string} text - Raw LLM response
 * @returns {object|null} Parsed JSON object or null
 */
function extractJSON(text) {
    if (typeof text !== 'string' || text.trim() === '') return null;

    // Try 1: Strip markdown code fences (```json ... ``` or ``` ... ```)
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch {
            // fall through
        }
    }

    // Try 2: Find the first { ... } block in the text
    const braceStart = text.indexOf('{');
    const braceEnd = text.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
        try {
            return JSON.parse(text.slice(braceStart, braceEnd + 1));
        } catch {
            // fall through
        }
    }

    // Try 3: Parse the whole string as JSON directly
    try {
        return JSON.parse(text.trim());
    } catch {
        return null;
    }
}

/**
 * Parse CSS selectors from a raw LLM response string.
 * @param {string} llmResponse - Raw LLM response string
 * @returns {{selectors: string[]} | null} Parsed selectors or null if invalid
 */
export function parseSelectorsFromResponse(llmResponse) {
    const parsed = extractJSON(llmResponse);
    if (!parsed || typeof parsed !== 'object') return null;

    if (!Array.isArray(parsed.selectors)) return null;

    // Every entry must be a non-empty string
    const valid = parsed.selectors.every(
        (s) => typeof s === 'string' && s.trim().length > 0
    );
    if (!valid) return null;

    return { selectors: parsed.selectors };
}

/**
 * Validate CSS selectors against source HTML using cheerio.
 * @param {string[]} selectors - CSS selectors to validate
 * @param {string} html - Source HTML to validate against
 * @returns {Array<{selector: string, matchCount: number}>} Valid selectors with match counts
 */
export function validateSelectors(selectors, html) {
    const $ = cheerio.load(html);
    const results = [];

    for (const selector of selectors) {
        try {
            const matched = $(selector);
            const matchCount = matched.length;

            if (matchCount === 0) {
                console.warn(`Warning: selector "${selector}" matched 0 elements — excluded.`);
            } else {
                results.push({ selector, matchCount });
            }
        } catch (err) {
            console.warn(`Warning: selector "${selector}" is invalid — ${err.message}`);
        }
    }

    return results;
}
