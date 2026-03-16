module.exports = {
    presets: [
        'babel-preset-expo',
        ['@babel/preset-react', { runtime: 'automatic' }]
    ],
    plugins: [
        [
            'module-resolver',
            {
                alias: {
                    '@': './',
                    '@app': './app',
                    '@constants': './constants',
                    '@components': './components',
                    '@context': './app/context',
                    '@hooks': './app/hooks',
                    '@navigation': './app/navigation',
                    '@screens': './app/screens',
                    '@services': './app/services',
                    '@types': './types',
                    '@utils': './utils',
                },
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            },
        ],
    ],
};