import { createInterface } from 'node:readline';
import { validateEnv, callLLM } from './llm-client.js';
import { readSourceHTML } from './ingestion.js';
import { buildPrompt } from './prompt-builder.js';
import { parseSelectorsFromResponse, validateSelectors } from './selector-parser.js';
import { injectHighlightStyles } from './style-injector.js';
import { writeOutputHTML } from './html-writer.js';

// ── Logging helpers ──────────────────────────────────────────────

const STEP = '▶';
const OK = '✔';
const WARN = '⚠';
const FAIL = '✖';
const INFO = 'ℹ';
const SEP = '─'.repeat(50);

function logStep(msg) { console.log(`\n${STEP}  ${msg}`); }
function logOk(msg) { console.log(`  ${OK}  ${msg}`); }
function logWarn(msg) { console.log(`  ${WARN}  ${msg}`); }
function logFail(msg) { console.error(`  ${FAIL}  ${msg}`); }
function logInfo(msg) { console.log(`  ${INFO}  ${msg}`); }

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
    console.log(`\n${SEP}`);
    console.log('  Semantic DOM Highlighter');
    console.log(SEP);

    // ── Step: Validate environment ───────────────────────────────
    logStep('Validating environment...');
    validateEnv();
    logOk('Environment variables loaded');

    const useDistiller = process.argv.includes('--distill');
    if (useDistiller) {
        logInfo('Distillation mode enabled (--distill)');
    }

    // Conditionally load the distiller module
    let distill;
    if (useDistiller) {
        try {
            const mod = await import('./distiller.js');
            distill = mod.distill;
            if (typeof distill !== 'function') {
                logWarn('Distiller module does not export a distill() function. Running without distillation.');
                distill = null;
            }
        } catch {
            logWarn('Failed to load distiller module. Running without distillation.');
            distill = null;
        }
    }

    while (true) {
        console.log(`\n${SEP}`);

        // ── Step: Ingest HTML ────────────────────────────────────
        logStep('Reading source HTML...');
        let source;
        try {
            source = await readSourceHTML();
        } catch (err) {
            logFail(err.message);
            process.exit(1);
        }
        logOk(`Loaded ${source.filePath} (${(source.content.length / 1024).toFixed(1)} KB)`);

        // ── Step: User input ─────────────────────────────────────
        logStep('Waiting for user input...');
        const description = await promptUser('  Describe elements to highlight: ');

        // Handle exit/quit
        const trimmed = description.trim().toLowerCase();
        if (trimmed === 'exit' || trimmed === 'quit') {
            logInfo('Exiting. Goodbye!');
            break;
        }

        // Reject empty/whitespace input
        if (isEmptyDescription(description)) {
            logWarn('Empty description — please enter a non-empty description.');
            continue;
        }
        logOk(`Description: "${description.trim()}"`);

        // ── Step: Distillation (optional) ────────────────────────
        let htmlForPrompt = source.content;
        let isDistilled = false;
        if (useDistiller && distill) {
            logStep('Distilling HTML...');
            htmlForPrompt = distill(source.content);
            isDistilled = true;
            const reduction = ((1 - htmlForPrompt.length / source.content.length) * 100).toFixed(1);
            logOk(`Distilled: ${source.content.length} → ${htmlForPrompt.length} chars (${reduction}% reduction)`);
        }

        // ── Step: Build prompt ───────────────────────────────────
        logStep('Building LLM prompt...');
        const { systemPrompt, userPrompt } = buildPrompt(htmlForPrompt, description, { isDistilled });
        logOk(`Prompt built (system: ${systemPrompt.length} chars, user: ${userPrompt.length} chars)`);

        // ── Step: Call LLM ───────────────────────────────────────
        logStep('Calling Azure OpenAI...');
        const llmStart = Date.now();
        let llmResponse;
        try {
            llmResponse = await callLLM(systemPrompt, userPrompt);
        } catch (err) {
            logFail(`LLM error: ${err.message}`);
            process.exit(1);
        }
        const llmDuration = ((Date.now() - llmStart) / 1000).toFixed(2);
        logOk(`LLM responded in ${llmDuration}s (${llmResponse.length} chars)`);

        // ── Step: Parse selectors ────────────────────────────────
        logStep('Parsing selectors from response...');
        const parsed = parseSelectorsFromResponse(llmResponse);
        if (!parsed) {
            logFail('Could not parse valid selectors from LLM response.');
            continue;
        }
        logOk(`Parsed ${parsed.selectors.length} selector(s): ${parsed.selectors.join(', ')}`);

        // ── Step: Validate selectors ─────────────────────────────
        logStep('Validating selectors against source HTML...');
        const validated = validateSelectors(parsed.selectors, source.content);
        if (validated.length === 0) {
            logWarn('No selectors matched any elements.');
            continue;
        }
        for (const v of validated) {
            logInfo(`"${v.selector}" → ${v.matchCount} element(s)`);
        }
        logOk(`${validated.length}/${parsed.selectors.length} selector(s) valid`);

        // ── Step: Inject highlight styles ────────────────────────
        logStep('Injecting highlight styles...');
        const { html, totalHighlighted } = injectHighlightStyles(
            source.content,
            validated.map((v) => v.selector)
        );
        logOk(`Highlighted ${totalHighlighted} element(s)`);

        // ── Step: Write output ───────────────────────────────────
        logStep('Writing output HTML...');
        const outputPath = await writeOutputHTML(html);
        logOk(`Output written → ${outputPath}`);

        // ── Done ─────────────────────────────────────────────────
        console.log(`\n  🎯 Done — ${totalHighlighted} element(s) highlighted`);
    }
}

main();
