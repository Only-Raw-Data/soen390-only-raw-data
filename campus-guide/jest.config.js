module.exports = {
    preset: 'jest-expo',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest'
    },
    testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)']
};