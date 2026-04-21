/**
 * Post-build script for Vercel deployment.
 * Copies the webpack-bundled lambda.js into api/ so Vercel can pick it up
 * as a serverless function.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'api');
const LAMBDA_SRC = path.join(__dirname, '..', 'dist', 'lambda.js');

if (fs.existsSync(API_DIR)) {
    fs.rmSync(API_DIR, { recursive: true, force: true });
}
fs.mkdirSync(API_DIR, { recursive: true });

fs.copyFileSync(LAMBDA_SRC, path.join(API_DIR, 'lambda.js'));

const entry = `'use strict';
module.exports = require('./lambda').default;
`;
fs.writeFileSync(path.join(API_DIR, 'index.js'), entry);

console.log('✅ Vercel entry point ready (api/index.js → api/lambda.js)');
