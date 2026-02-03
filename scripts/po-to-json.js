#!/usr/bin/env node
/**
 * Converts .po translation files to JSON format for runtime loading.
 * Uses gettext-parser to parse .po files.
 */

const fs = require('fs');
const path = require('path');
const gettextParser = require('gettext-parser');

const LANGUAGES_DIR = path.join(__dirname, '..', 'translations', 'languages');
const OUTPUT_DIR = path.join(__dirname, '..', 'src', 'translations');

// Language code mapping (e.g., de_DE.po -> de.json)
const LANG_MAP = {
  'de_DE': 'de',
  'pt_PT': 'pt'
};

function convertPoToJson(poFilePath) {
  const content = fs.readFileSync(poFilePath, 'utf-8');
  const parsed = gettextParser.po.parse(content);

  const translations = {};
  const messages = parsed.translations[''] || {};

  for (const [msgid, entry] of Object.entries(messages)) {
    if (msgid && entry.msgstr && entry.msgstr[0]) {
      translations[msgid] = entry.msgstr[0];
    }
  }

  return translations;
}

function main() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const poFiles = fs.readdirSync(LANGUAGES_DIR).filter(f => f.endsWith('.po'));

  console.log(`Converting ${poFiles.length} .po files to JSON...`);

  for (const poFile of poFiles) {
    const poPath = path.join(LANGUAGES_DIR, poFile);
    let langCode = path.basename(poFile, '.po');

    // Apply language code mapping
    if (LANG_MAP[langCode]) {
      langCode = LANG_MAP[langCode];
    }

    const translations = convertPoToJson(poPath);
    const jsonPath = path.join(OUTPUT_DIR, `${langCode}.json`);

    fs.writeFileSync(jsonPath, JSON.stringify(translations, null, 2));
    console.log(`  ${poFile} -> ${langCode}.json (${Object.keys(translations).length} strings)`);
  }

  console.log('Done!');
}

main();
