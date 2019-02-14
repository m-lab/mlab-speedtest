var gulp = require('gulp');
var inject = require('gulp-inject');
var gettext = require('gulp-angular-gettext');

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
