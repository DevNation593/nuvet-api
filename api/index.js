'use strict';
/**
 * Vercel serverless function entry point.
 * Loads the compiled NestJS handler from dist/lambda.js
 * (produced by `pnpm run build` → nest build).
 */
const path = require('path');
const handlerPath = path.resolve(__dirname, '..', 'dist', 'lambda');
try {
    module.exports = require(handlerPath).default;
} catch (err) {
    console.error('Failed to load NestJS handler from:', handlerPath);
    console.error(err);
    module.exports = (_req, res) => {
        res.status(500).json({ error: 'Server failed to start. Check build logs.' });
    };
}
