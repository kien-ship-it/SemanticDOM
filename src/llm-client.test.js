import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateEnv } from './llm-client.js';

const REQUIRED_VARS = ['endpoint', 'deployment', 'subscription_key', 'api_version'];

describe('validateEnv', () => {
    let savedEnv;

    beforeEach(() => {
        savedEnv = { ...process.env };
    });

    afterEach(() => {
        // Restore original env
        for (const key of REQUIRED_VARS) {
            if (savedEnv[key] !== undefined) {
                process.env[key] = savedEnv[key];
            } else {
                delete process.env[key];
            }
        }
    });

    it('should not throw when all required vars are present', () => {
        for (const key of REQUIRED_VARS) {
            process.env[key] = 'test-value';
        }
        expect(() => validateEnv()).not.toThrow();
    });

    it('should throw when all required vars are missing', () => {
        for (const key of REQUIRED_VARS) {
            delete process.env[key];
        }
        expect(() => validateEnv()).toThrow('Missing required environment variables');
        try {
            validateEnv();
        } catch (e) {
            for (const key of REQUIRED_VARS) {
                expect(e.message).toContain(key);
            }
        }
    });

    it('should list only the missing vars in the error message', () => {
        process.env.endpoint = 'https://example.com';
        process.env.deployment = 'my-model';
        delete process.env.subscription_key;
        delete process.env.api_version;

        expect(() => validateEnv()).toThrow('subscription_key');
        expect(() => validateEnv()).toThrow('api_version');
        try {
            validateEnv();
        } catch (e) {
            expect(e.message).not.toContain('endpoint');
            expect(e.message).not.toContain('deployment');
        }
    });

    it('should treat whitespace-only values as missing', () => {
        for (const key of REQUIRED_VARS) {
            process.env[key] = '   ';
        }
        expect(() => validateEnv()).toThrow('Missing required environment variables');
    });

    it('should treat empty string values as missing', () => {
        for (const key of REQUIRED_VARS) {
            process.env[key] = '';
        }
        expect(() => validateEnv()).toThrow('Missing required environment variables');
    });

    it('should throw listing a single missing var', () => {
        process.env.endpoint = 'https://example.com';
        process.env.deployment = 'my-model';
        process.env.subscription_key = 'key-123';
        delete process.env.api_version;

        expect(() => validateEnv()).toThrow('api_version');
        try {
            validateEnv();
        } catch (e) {
            expect(e.message).not.toContain('endpoint');
            expect(e.message).not.toContain('deployment');
            expect(e.message).not.toContain('subscription_key');
        }
    });
});
