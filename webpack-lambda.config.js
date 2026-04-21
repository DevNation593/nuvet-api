const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = (options) => ({
    ...options,
    entry: { lambda: './src/lambda.ts' },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'commonjs2',
    },
    externals: [
        nodeExternals({
            allowlist: [/^@nuvet\//],
        }),
    ],
    optimization: { minimize: false },
});
