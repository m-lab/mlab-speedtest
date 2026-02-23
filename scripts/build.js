#!/usr/bin/env node
/**
 * Build script for M-Lab Speed Test
 * Copies source files to dist/ and sets up dependencies
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const NODE_MODULES = path.join(ROOT, 'node_modules');

/**
 * Recursively copy a directory
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy a single file
 */
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

/**
 * Main build process
 */
function build() {
  console.log('Building M-Lab Speed Test...\n');

  // Clean dist directory
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }

  // Copy src/ to dist/
  console.log('Copying source files...');
  copyDir(SRC, DIST);

  // Font-awesome CSS uses ../fonts/ from css/ directory, so copy fonts there too
  console.log('Copying fonts for font-awesome compatibility...');
  copyDir(path.join(SRC, 'assets', 'fonts'), path.join(DIST, 'fonts'));

  // Convert .po translations to JSON
  console.log('Converting translations...');
  const convertTranslations = require('./po-to-json');
  convertTranslations(path.join(DIST, 'translations'));

  // Copy M-Lab libraries from node_modules
  console.log('Copying M-Lab libraries...');
  const libDest = path.join(DIST, 'libraries');
  if (!fs.existsSync(libDest)) {
    fs.mkdirSync(libDest, { recursive: true });
  }

  // ndt7 (uses src/ folder)
  const ndt7Pkg = path.join(NODE_MODULES, '@m-lab', 'ndt7', 'src');
  copyFile(path.join(ndt7Pkg, 'ndt7.js'), path.join(libDest, 'ndt7.js'));
  copyFile(path.join(ndt7Pkg, 'ndt7-upload-worker.js'), path.join(libDest, 'ndt7-upload-worker.js'));
  copyFile(path.join(ndt7Pkg, 'ndt7-download-worker.js'), path.join(libDest, 'ndt7-download-worker.js'));

  // msak (uses dist/ folder)
  const msakPkg = path.join(NODE_MODULES, '@m-lab', 'msak', 'dist');
  copyFile(path.join(msakPkg, 'msak.min.js'), path.join(libDest, 'msak.min.js'));

  console.log('\nBuild complete! Output in dist/');
}

build();
