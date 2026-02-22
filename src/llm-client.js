import 'dotenv/config';
import { AzureOpenAI } from 'openai';

const REQUIRED_ENV_VARS = ['endpoint', 'deployment', 'subscription_key', 'api_version'];

/**
 * Validates that all required environment variables are present.
 * @returns {void}
 * @throws {Error} If required env vars are missing
 */
export function validateEnv() {
    const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]?.trim());
    if (missing.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`
        );
    }
}

/**
 * Calls Azure OpenAI with the given system and user prompts.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>} Raw response content
 * @throws {Error} On API errors or missing credentials
 */
export async function callLLM(systemPrompt, userPrompt) {
    validateEnv();

    const client = new AzureOpenAI({
        apiKey: process.env.subscription_key,
        apiVersion: process.env.api_version,
        endpoint: process.env.endpoint,
    });

    try {
        const response = await client.chat.completions.create({
            model: process.env.deployment,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (content == null) {
            throw new Error('LLM response contained no message content');
        }
        return content;
    } catch (error) {
        if (error.status) {
            throw new Error(
                `Azure OpenAI API error (${error.status}): ${error.message}`
            );
        }
        throw error;
    }
}
