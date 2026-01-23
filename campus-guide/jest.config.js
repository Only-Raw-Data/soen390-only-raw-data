module.exports = {
    preset: 'jest-expo',
    testEnvironment: 'node',
    transform: { '^.+\\.[jt]sx?$': 'babel-jest' },
    testMatch: ['**/__tests__/**/*.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
    setupFiles: ['react-native-gesture-handler/jestSetup.js'],
    moduleNameMapper: {
        '^expo$': '<rootDir>/__mocks__/expo.js',
        '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
        '^expo-status-bar$': '<rootDir>/__mocks__/expo-status-bar.js',
        '^expo-router$': '<rootDir>/__mocks__/expo-router.js'
    },
    transformIgnorePatterns: [
        'node_modules/(?!(@react-native|react-native|react-native-reanimated|expo|@expo|expo-.*)/)'
    ]
};

module.exports = {};

module.exports = { default: { statusBarHeight: 0 } };

module.exports = { StatusBar: () => null };

module.exports = { Link: () => null, useRouter: () => ({}) };