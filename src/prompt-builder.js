/**
 * Prompt Builder module.
 * Constructs chat completion messages for Azure OpenAI to return CSS selectors
 * matching a developer's semantic description of DOM elements.
 */

/**
 * Build the system and user prompts for the LLM.
 *
 * @param {string} html - The HTML content (source or distilled skeleton)
 * @param {string} description - The user's semantic description
 * @param {object} [options]
 * @param {boolean} [options.isDistilled=false] - Whether the HTML has been distilled
 * @returns {{systemPrompt: string, userPrompt: string}}
 */
export function buildPrompt(html, description, options = {}) {
    const { isDistilled = false } = options;

    let systemPrompt =
        `You are a DOM analysis expert. Your task is to analyze HTML structure and return CSS selectors that match elements described by the user.\n` +
        `\n` +
        `Rules:\n` +
        `- Return your answer as JSON in this exact format: { "selectors": ["selector1", "selector2"] }\n` +
        `- Return ONLY the JSON object, no additional text or explanation.\n` +
        `- Prefer specific selectors over generic ones. Avoid bare tag selectors like \`div\` or \`span\` — use classes, IDs, attributes, or combinators to be precise.\n` +
        `- Return multiple selectors if the description maps to different element types.\n` +
        `- Each selector should match the described elements without over-matching unrelated elements.`;

    if (isDistilled) {
        systemPrompt +=
            `\n- IMPORTANT: The HTML provided is a simplified skeleton of the original document. ` +
            `Non-structural tags, utility classes, and non-semantic attributes have been removed. ` +
            `The selectors you return must work on the original full HTML document, not just this skeleton.`;
    }

    const userPrompt =
        `Here is the HTML to analyze:\n\n${html}\n\n` +
        `Find all elements matching this description: ${description}`;

    return { systemPrompt, userPrompt };
}
