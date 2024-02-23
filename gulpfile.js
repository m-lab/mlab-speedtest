var gulp = require('gulp');
var inject = require('gulp-inject');
var gettext = require('gulp-angular-gettext');

function inject(cb) {
  gulp.src('www/index.html')
  .pipe(inject(gulp.src('www/translations/scripts/*.js', {read: false}), {relative: true, name: 'translations'}))
  .pipe(gulp.dest('www'));

  cb();
};

function translations(cb) {
  return gulp.src('translations/languages/*.po')
  .pipe(gettext.compile())
  .pipe(gulp.dest('app/assets/translations/'));
  cb();
};

function pot(cb) {
  return gulp.src([
    'app/measure/*.js',
    'app/measure/*.html',
    'app/index.html',
  ])
  .pipe(gettext.extract('application.pot', {
    // options to pass to angular-gettext-tools...
  }))
  .pipe(gulp.dest('translations/source'));

  cb();
};

// Copy dependencies to ./public/libs/
function copy_libs(cb) {
  // Copy all the libraries under @bower_components to libraries/.
  gulp.src([
    "./node_modules/@bower_components/**/*.**",
  ], {base: "./node_modules/@bower_components"})
    .pipe(gulp.dest('./app/libraries'));

  // Copy the minified @m-lab/ndt7 js files to libraries/.
  gulp.src([
    "./node_modules/@m-lab/ndt7/src/*.min.js",
    "./node_modules/@m-lab/msak/dist/*.min.js",
  ])

  .pipe(gulp.dest('./app/libraries'));

  gulp.src([
    "./node_modules/ua-device-detector/ua-device-detector.min.js",
    "./node_modules/ng-device-detector/ng-device-detector.min.js",
    "./node_modules/re-tree/re-tree.min.js",
  ])
    .pipe(gulp.dest('./app/libraries'));

  cb();
};

exports.translations = gulp.series(pot, translations);
exports.inject = gulp.series(translations, inject);
exports.copy_libs = copy_libs;
exports.pot = pot;

exports.default = copy_libs;
