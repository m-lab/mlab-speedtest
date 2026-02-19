# speed.measurementlab.net source code

`mlab-speedtest` is an Angular.js application providing the website https://speed.measurementlab.net. The app code currently uses `gulp` to integrate language localizations prior to deployment.

## Setting up Local Development Environment

### Requirements

The project requires the following tools to be installed:

- [Node.js](https://nodejs.org/) >= v10.15.1
- [Yarn](https://yarnpkg.com/) (package manager)
- [Python 3](https://www.python.org/) (for local preview server)

Optional (for M-Lab team members):
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### Installation

We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage your Node.js version.

```bash
nvm install v10.15.1
nvm use v10.15.1
```

Install project dependencies using Yarn:

```bash
yarn install
```

Copy third-party libraries into the `app/libraries/` directory:

```bash
gulp copy_libs
```

### Running Locally

To preview the site locally, navigate to the `/app` directory and start a Python HTTP server:

```bash
cd app
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

If you are a member of the M-Lab Firebase project, you can also preview using the Firebase CLI:

```bash
firebase serve --only hosting:mlab-speedtest
```

## Adding new languages

Translations for this site are managed in the [Open Technology Fund's Localization Lab Transifex site](https://www.transifex.com/otf/m-lab-ndt-portal/dashboard/). Contributing translators may choose to translate and/or review translations there. Completed translations are then imported for use within this application and published by M-Lab staff.

### How to add a new localization

* Download a completed language translation file
  * Visit the Transifex site and locate a completed language
  * Click **Interface Language Strings** and then **Download for use** to download the completed language `.po` file
  * Save it in the folder: `/translations/source/` using the file name pattern: **<two letter langugage code>.po**
* Create new language template & update language string references
  * Create a copy of an existing translation folder and index.html file, and make some edits to support the new language
    * Copy the folder and index file: `cp -r app/nl app/es`
    * Edit the index file to change the language it references. In `app/es/index.html`: 
      * change: `const INTERFACE_LANGUAGE = 'nl';` to `const INTERFACE_LANGUAGE = 'es';`
      * change: `<script src="/assets/translations/it.js"></script>`
    * to: `<script src="/assets/translations/es.js"></script>`
  * Regenerate the supported language strings: 
    * `gulp inject`

## Deployment

The site is deployed via GitHub Actions to Firebase Hosting:

| Environment | Trigger                       | URL                              |
|-------------|-------------------------------|----------------------------------|
| Sandbox     | Pull request (from same repo) | https://mlab-sandbox.web.app     |
| Production  | Merge to `main`               | https://speed.measurementlab.net |

**Note:** PR deployments only work for branches pushed directly to `m-lab/mlab-speedtest`, not from forks (due to Firebase secrets not being available to fork PRs).
