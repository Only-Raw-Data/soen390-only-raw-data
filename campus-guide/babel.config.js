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
                    '@components': './app/components',
                    '@context': './app/context',
                    '@hooks': './app/hooks',
                    '@navigation': './app/navigation',
                    '@screens': './app/screens',
                    '@services': './app/services',
                    '@types': './app/types',
                    '@utils': './app/utils',
                },
                extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            },
        ],
    ],
};