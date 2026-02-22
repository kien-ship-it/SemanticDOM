import { createInterface } from 'node:readline';
import { validateEnv, callLLM } from './llm-client.js';
import { readSourceHTML } from './ingestion.js';
import { buildPrompt } from './prompt-builder.js';
import { parseSelectorsFromResponse, validateSelectors } from './selector-parser.js';
import { injectHighlightStyles } from './style-injector.js';
import { writeOutputHTML } from './html-writer.js';

/**
 * Prompt the user for input via readline.
 * @param {string} query - The prompt text
 * @returns {Promise<string>} The user's input
 */
function promptUser(query) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(query, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

/**
 * Check if a description is empty or whitespace-only.
 * @param {string} description
 * @returns {boolean}
 */
export function isEmptyDescription(description) {
    return !description || description.trim().length === 0;
}

async function main() {
    validateEnv();

    const useDistiller = process.argv.includes('--distill');

    // Conditionally load the distiller module
    let distill;
    if (useDistiller) {
        try {
            const mod = await import('./distiller.js');
            distill = mod.distill;
            if (typeof distill !== 'function') {
                console.error('Distiller module does not export a distill() function. Running without distillation.');
                distill = null;
            }
        } catch {
            console.error('Failed to load distiller module. Running without distillation.');
            distill = null;
        }
    }

    while (true) {
        // Re-read source HTML each iteration to pick up changes
        let source;
        try {
            source = await readSourceHTML();
        } catch (err) {
            console.error(err.message);
            process.exit(1);
        }

        console.log(`Loaded: ${source.filePath}`);

        // Prompt for semantic description
        const description = await promptUser('Describe elements to highlight: ');

        // Handle exit/quit
        const trimmed = description.trim().toLowerCase();
        if (trimmed === 'exit' || trimmed === 'quit') break;

        // Reject empty/whitespace input
        if (isEmptyDescription(description)) {
            console.log('Please enter a non-empty description.');
            continue;
        }

        // Optional distillation step
        let htmlForPrompt = source.content;
        let isDistilled = false;
        if (useDistiller && distill) {
            htmlForPrompt = distill(source.content);
            isDistilled = true;
            console.log(`Distilled: ${source.content.length} → ${htmlForPrompt.length} chars`);
        }

        // Build prompt and call LLM
        const { systemPrompt, userPrompt } = buildPrompt(htmlForPrompt, description, { isDistilled });

        let llmResponse;
        try {
            llmResponse = await callLLM(systemPrompt, userPrompt);
        } catch (err) {
            console.error(`LLM error: ${err.message}`);
            process.exit(1);
        }

        // Parse selectors from response
        const parsed = parseSelectorsFromResponse(llmResponse);
        if (!parsed) {
            console.log('Could not parse valid selectors from LLM response.');
            continue;
        }

        // Always validate against original source HTML
        const validated = validateSelectors(parsed.selectors, source.content);
        if (validated.length === 0) {
            console.log('No matching elements found.');
            continue;
        }

        // Inject highlight styles and write output
        const { html, totalHighlighted } = injectHighlightStyles(
            source.content,
            validated.map((v) => v.selector)
        );
        const outputPath = await writeOutputHTML(html);

        console.log(`Highlighted ${totalHighlighted} elements → ${outputPath}`);
    }
}

main();
