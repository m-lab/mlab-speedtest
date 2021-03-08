var gulp = require('gulp');
var inject = require('gulp-inject');
var gettext = require('gulp-angular-gettext');
var npmDist = require('gulp-npm-dist');

gulp.task('inject', ['translations'], function() {
  gulp.src('www/index.html')
  .pipe(inject(gulp.src('www/translations/scripts/*.js', {read: false}), {relative: true, name: 'translations'}))
  .pipe(gulp.dest('www'));
});

gulp.task('translations', ['pot'], function () {
  return gulp.src('translations/languages/*.po')
  .pipe(gettext.compile())
  .pipe(gulp.dest('app/assets/translations/'));
});

gulp.task('pot', function () {
  return gulp.src([
    'app/measure/*.js',
    'app/measure/*.html',
    'app/index.html',
  ])
  .pipe(gettext.extract('application.pot', {
    // options to pass to angular-gettext-tools...
  }))
  .pipe(gulp.dest('translations/source'));
});

// Copy dependencies to ./public/libs/
gulp.task('copy_libs', function() {
  // Copy all the libraries under @bower_components to libraries/.
  gulp.src([
    "./node_modules/@bower_components/**/*.**",
  ], {base: "./node_modules/@bower_components"})
    .pipe(gulp.dest('./app/libraries'));

  // Copy the minified @m-lab/ndt7 js files to libraries/.
  gulp.src([
    "./node_modules/@m-lab/ndt7/src/*.min.js",
  ])
    .pipe(gulp.dest('./app/libraries'));

  gulp.src([
    "./node_modules/ua-device-detector/ua-device-detector.min.js",
    "./node_modules/ng-device-detector/ng-device-detector.min.js",
    "./node_modules/re-tree/re-tree.min.js",   
  ])
    .pipe(gulp.dest('./app/libraries'));
  });