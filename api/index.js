'use strict';
/**
 * Vercel serverless function entry point.
 * Loads the compiled NestJS handler from dist/lambda.js
 * (produced by `pnpm run build` → nest build).
 */
module.exports = require('../dist/lambda').default;
