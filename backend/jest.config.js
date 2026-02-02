module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
        '^.+\\.ts$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/node_modules/$1',
        '^(\\.{1,2}[^/]*)\\.([^\\.]+)$': '<rootDir>/node_modules/$2/src/$1',
        '^(\\.{1,2}[^/]*)\\.([^\\.]+)$': '<rootDir>/node_modules/$2/src/$1',
    },
    coverageDirectory: 'coverage',
    collectCoverage: true,
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
