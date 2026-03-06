import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.ts'],
            exclude: ['src/index.ts', 'src/workers/**'],
        },
        // Run all tests in a single process to avoid state conflicts
        pool: 'forks',
        poolOptions: {
            forks: { singleFork: true },
        },
        // Inline pino & pino-pretty (ESM packages that need special handling in vitest)
        server: {
            deps: {
                inline: ['pino', 'pino-pretty'],
            },
        },
    },
});
