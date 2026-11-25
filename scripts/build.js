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
 * Copy a @fontsource stylesheet and only the font files it references
 */
function copyFontCSS(srcCSS, destCSS) {
  const css = fs.readFileSync(srcCSS, 'utf8');
  copyFile(srcCSS, destCSS);
  for (const [, rel] of css.matchAll(/url\((\.\/files\/[^)]+)\)/g)) {
    copyFile(path.join(path.dirname(srcCSS), rel), path.join(path.dirname(destCSS), rel));
  }
}

/**
 * Main build process
 */
function build() {
  // Read command line arguments
  const argv = process.argv;
  if (argv.length !== 3) {
    console.log('usage: node scripts/build.js prod|staging');
    process.exit(1);
  }
  const mlabEnvName = argv[2];
  if (mlabEnvName !== 'prod' && mlabEnvName !== 'staging') {
    console.log('usage: node scripts/build.js prod|staging');
    process.exit(1);
  }
  console.log('Building M-Lab Speed Test...');
  console.log('');
  console.log(`DIST: ${DIST}`);
  console.log(`Environment: ${mlabEnvName}`);
  console.log(`SRC: ${SRC}`);
  console.log('');

  // Clean dist directory
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }

  // Copy src/ to dist/
  console.log('Copying source files...');
  copyDir(SRC, DIST);

  // Self-host the brand fonts so the page makes no third-party font requests
  console.log('Copying fonts...');
  copyFontCSS(path.join(NODE_MODULES, '@fontsource-variable', 'inter', 'index.css'),
    path.join(DIST, 'fonts', 'inter', 'inter.css'));
  for (const weight of ['400', '700']) {
    copyFontCSS(path.join(NODE_MODULES, '@fontsource', 'ibm-plex-mono', `${weight}.css`),
      path.join(DIST, 'fonts', 'ibm-plex-mono', `${weight}.css`));
  }

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

  // Bundle Sentry SDK
  console.log('Bundling Sentry SDK...');
  const esbuild = require('esbuild');
  esbuild.buildSync({
    entryPoints: [path.join(SRC, 'js', 'sentry-entry.js')],
    bundle: true,
    minify: true,
    outfile: path.join(DIST, 'js', 'sentry.bundle.js'),
    format: 'iife',
  });

  // Write dist/js/env.js
  const sentryDsn = process.env.SENTRY_DSN || '';
  const envJsPath = path.join(DIST, 'js', 'env.js');
  console.log(`Writing ${envJsPath}...`)
  fs.writeFileSync(envJsPath,
    `const mlabEnvName = "${mlabEnvName}";\n` +
    `const mlabSentryDsn = "${sentryDsn}";\n`
  );

  console.log('\nBuild complete! Output in dist/');
}

build();
