# speed.measurementlab.net source code

`mlab-speedtest` is an Angular.js application providing the website https://speed.measurementlab.net. The app code currently uses `gulp` to integrate language localizations prior to deployment.

## Setting up Local Development Environment

### Install Build Dependencies

* Install website build dependencies for your operating system and environment
  * Node >= v10.15.1 - Using NVM: `nvm install v10.15.1`
  * Gulp - Installed with `yarn`
  * Install libraries - `gulp copy_libs`
  * Firebase tools - `npm install -g firebase-tools`

## Adding new languages

Translations for this site are managed in the [Open Technology Fund's Localization Lab Transifex site](https://www.transifex.com/otf/m-lab-ndt-portal/dashboard/). Contributing translators may choose to translate and/or review translations there. Completed translations are then imported for use within this application and published by M-Lab staff.

### How to add a new localization

* Download a completed language translation file
  * Visit the Transifex site and locate a completed language
  * Click **Interface Language Strings** and then **Download for use** to download the completed language `.po` file
  * Save it in the folder: `/translations/source/` using the file name pattern: **<two letter language code>.po**
* Create new language template & update language string references
  * Create a copy of an existing translation folder and index.html file, and make some edits to support the new language
    * Copy the folder and index file: `cp -r app/nl app/es`
    * Edit the index file to change the language it references. In `app/es/index.html`: 
      * change: `const INTERFACE_LANGUAGE = 'nl';` to `const INTERFACE_LANGUAGE = 'es';`
      * change: `<script src="/assets/translations/nl.js"></script>`
    * to: `<script src="/assets/translations/es.js"></script>`
  * Regenerate the supported language strings: 
    * `gulp inject`

## Previewing site locally

To preview the site locally, we recommend using the Python Simple HTTP Server. 

* Navigate to the `/app` directory and run: `python3 -m http.server 8000`

If you are a user on the M-Lab Firebase project, you can also preview the site locally using the firebase-cli: `firebase serve --only hosting:mlab-speedtest`

## Deployment

The site is deployed via GitHub Actions to Firebase Hosting:

| Environment | Trigger                       | URL                              |
|-------------|-------------------------------|----------------------------------|
| Sandbox     | Pull request (from same repo) | https://mlab-sandbox.web.app     |
| Production  | Merge to `main`               | https://speed.measurementlab.net |

**Note:** PR deployments only work for branches pushed directly to `m-lab/mlab-speedtest`, not from forks (due to Firebase secrets not being available to fork PRs).
