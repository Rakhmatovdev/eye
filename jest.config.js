const nextJest = require('next/jest');

// `next/jest` builds a Jest config that already knows how to run the Next.js
// SWC transform, handle CSS/font/image imports, and load .env files — no
// hand-rolled babel/ts-jest setup needed.
const createJestConfig = nextJest({
  // Path to the Next.js app, used to load next.config.js / .env files.
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
};

// createJestConfig is exported this way so next/jest can load the Next.js
// config (async) before merging it with our overrides above.
module.exports = createJestConfig(customJestConfig);
