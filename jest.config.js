const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)'],
  transform: {
    '^.+\\.mdx$': '<rootDir>/jest.transform.mdx.cjs',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@mdx-js/react)/)',
  ],
};

module.exports = async () => {
  const config = await createJestConfig(customJestConfig)();
  config.transform = {
    ...(config.transform || {}),
    '^.+\\.mdx$': '<rootDir>/jest.transform.mdx.cjs',
  };
  config.moduleFileExtensions = Array.from(
    new Set([
      'js',
      'jsx',
      'ts',
      'tsx',
      'json',
      'node',
      ...(config.moduleFileExtensions || []),
      'md',
      'mdx',
    ])
  );
  return config;
};
