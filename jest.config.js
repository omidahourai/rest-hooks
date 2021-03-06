module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  coveragePathIgnorePatterns: ['test', 'react-integration/hooks/useSelection'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  setupFiles: ['./scripts/testSetup.js'],
};
