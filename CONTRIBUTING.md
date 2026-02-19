# Contributing to mlab-speedtest

Thank you for your interest in contributing to [speed.measurementlab.net](https://speed.measurementlab.net)! This guide covers everything you need to get started.

---

## Table of Contents

- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Adding a New Language](#adding-a-new-language)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Deployment](#deployment)

---

## Local Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= v10.15.1 (recommend using [nvm](https://github.com/nvm-sh/nvm))
- [Yarn](https://yarnpkg.com/) >= 1.0.0

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/m-lab/mlab-speedtest.git
   cd mlab-speedtest
   ```

2. **Install dependencies**

   ```bash
   npx yarn install
   ```

   This installs all packages and automatically creates the `app/libraries` symlink via the `postinstall` script.

3. **Copy JS libraries into `app/libraries/`**

   ```bash
   npx gulp copy_libs
   ```

   This copies `ndt7`, `msak`, and other required libraries into `app/libraries/`.

4. **Run the site locally**

   ```bash
   cd app
   python3 -m http.server 8000
   ```

   Then open [http://localhost:8000](http://localhost:8000) in your browser.

> **Note:** The speed test will use `mlab-staging` as the backend when running locally — this is the intended safe default for development.

---

## Project Structure

```
mlab-speedtest/
├── app/                    # Static site served by Firebase Hosting
│   ├── index.html          # Main entry point (English)
│   ├── app.js              # Angular module bootstrap
│   ├── measure/            # Speed test controller and template
│   │   ├── measure.js      # Core test logic (NDT7 + MSAK)
│   │   └── measure.html    # Test UI template
│   ├── services/
│   │   └── gaugeService.js # Canvas progress gauge
│   ├── assets/             # CSS, images, and JS utilities
│   ├── libraries/          # Auto-generated — do not edit (run `yarn build`)
│   ├── az/ de/ el/ ...     # Language-specific index.html variants
│   └── translations/       # Compiled translation JS files
├── translations/           # Source .po translation files
├── .github/workflows/      # CI/CD via GitHub Actions + Firebase Hosting
├── gulpfile.js             # Build tasks (copy_libs, translations)
└── package.json
```

---

## Making Changes

- **`app/measure/measure.js`** — Core speed test logic. This is where NDT7 and MSAK test runs are orchestrated.
- **`app/services/gaugeService.js`** — The circular progress gauge drawn on a `<canvas>` element.
- **`app/measure/measure.html`** — The main UI template (results table, start button, etc.).
- **`app/index.html`** — The main shell page (sidebar, footer, script tags).

> If you modify `app/index.html`, remember that each language folder (`az/`, `de/`, `es/`, etc.) contains its own `index.html` with language-specific settings. Changes to the shared structure need to be replicated across those files. See [issue #34](https://github.com/m-lab/mlab-speedtest/issues/34).

---

## Adding a New Language

1. Download the completed `.po` translation file from [Transifex](https://www.transifex.com/otf/m-lab-ndt-portal/dashboard/).

2. Save it to `translations/source/<lang-code>.po` (e.g. `translations/source/ja.po`).

3. Compile translations and regenerate language string references:
   ```bash
   npx gulp inject
   ```

4. Copy an existing language folder and update it:
   ```bash
   cp -r app/nl app/ja
   ```
   In `app/ja/index.html`, update:
   - `const INTERFACE_LANGUAGE = 'nl';` → `'ja'`
   - `<script src="/assets/translations/nl.js">` → `ja.js`

---

## Submitting a Pull Request

1. **Fork** the repository and create your branch from `main`:
   ```bash
   git checkout -b fix/your-description
   ```

2. **Make your changes** and commit with a clear message following [Conventional Commits](https://www.conventionalcommits.org/) style:
   - `fix:` for bug fixes
   - `feat:` for new features
   - `chore:` for maintenance (deps, config)
   - `docs:` for documentation
   - `ci:` for CI/CD changes

3. **Push your branch** and open a PR against `main`.

4. **PR previews** are automatically deployed to Firebase Hosting on the `mlab-sandbox` project for same-repo branches.

> **Note:** PR preview deployments are only available for branches pushed directly to `m-lab/mlab-speedtest`, not from forks (Firebase secrets are not available to fork PRs).


