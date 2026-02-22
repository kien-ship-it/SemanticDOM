import * as cheerio from 'cheerio';

/**
 * Inject highlight styles into DOM elements matching the given CSS selectors.
 *
 * @param {string} html - Source HTML
 * @param {string[]} selectors - Validated CSS selectors
 * @param {string} highlightStyle - CSS style string to inject
 * @returns {{html: string, totalHighlighted: number}}
 */
export function injectHighlightStyles(
    html,
    selectors,
    highlightStyle = 'border: 4px solid red; background: rgba(255, 255, 0, 0.3);'
) {
    const $ = cheerio.load(html);
    const highlighted = new Set();

    for (const selector of selectors) {
        try {
            $(selector).each((_i, el) => {
                const node = $(el);
                // Use a unique identifier for deduplication — the cheerio element reference itself
                if (!highlighted.has(el)) {
                    highlighted.add(el);
                }

                const existing = node.attr('style');
                if (existing) {
                    // Append highlight style, ensuring a semicolon separator
                    const trimmed = existing.trimEnd();
                    const separator = trimmed.endsWith(';') ? ' ' : '; ';
                    node.attr('style', trimmed + separator + highlightStyle);
                } else {
                    node.attr('style', highlightStyle);
                }
            });
        } catch {
            // Skip invalid selectors silently — they should have been filtered by the selector parser
        }
    }

    return {
        html: $.html(),
        totalHighlighted: highlighted.size,
    };
}
