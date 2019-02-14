# speed.measurementlab.net source code

`mlab-speedtest` is an Angular.js application providing the website https://speed.measurementlab.net

## Setting up Local Development Environment

### Install Build Dependencies

* Install website build dependencies for your operating system and environment
  * Node
  * - 
  * -

## Adding new languages

* Managed in Transifex
* Download new .po file, save in `/translations/source/`
* Create new language template & update language string references
  * copy existing translation template. example: `cp -r app/nl app/it`
  * edit `app/it/index.html`: 
    * change: `const INTERFACE_LANGUAGE = 'nl';` to `const INTERFACE_LANGUAGE = 'it';`
    * change: `<script src="/assets/translations/it.js"></script>`
    * to: `<script src="/assets/translations/it.js"></script>`
  * regenerate language strings: 
    * `gulp inject`

## Previewing site locally

To preview the site locally, we recommend using the Python Simple HTTP Server. Navigate to the `/app` directory and run:

* `python -m http.server 8000` (Python 3.x)
* `python -m SimpleHTTPServer` (older versions)