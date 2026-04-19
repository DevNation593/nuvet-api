/**
 * Post-build script for Vercel deployment.
 * Creates api/index.js that directly re-exports the compiled lambda handler,
 * with all dist/ files copied into api/dist/ so nft can trace everything
 * from a single root.
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'api');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const API_DIST_DIR = path.join(API_DIR, 'dist');

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Clean previous api/ output
if (fs.existsSync(API_DIR)) {
    fs.rmSync(API_DIR, { recursive: true, force: true });
}

// Copy compiled dist/ into api/dist/
copyDirSync(DIST_DIR, API_DIST_DIR);

// Create entry point that loads the handler from the local copy
const entryContent = `'use strict';
module.exports = require('./dist/lambda').default;
`;

fs.writeFileSync(path.join(API_DIR, 'index.js'), entryContent);

console.log('✅ Vercel API entry point prepared (api/index.js → api/dist/lambda.js)');
