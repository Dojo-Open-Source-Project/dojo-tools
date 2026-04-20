import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: [
            {
                find: /^@dojo-tools\/bip47\/utils$/,
                replacement: fileURLToPath(new URL('../bip47/src/utils.ts', import.meta.url)),
            },
            {
                find: /^@dojo-tools\/bip47$/,
                replacement: fileURLToPath(new URL('../bip47/src/index.ts', import.meta.url)),
            },
            {
                find: /^@dojo-tools\/bitcoinjs-message$/,
                replacement: fileURLToPath(new URL('../bitcoinjs-message/src/index.ts', import.meta.url)),
            },
        ],
    },
    test: {
        globals: true,
        include: ['./test/**/*.test.ts'],
        exclude: ['./test/test-vectors.ts'],
        coverage: {
            provider: 'v8'
        }
    },
});
