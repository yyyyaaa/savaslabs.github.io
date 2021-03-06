/**
 * @file
 *
 * Gulp tasks for the Savas Labs website.
 *
 * Table of contents:
 *   1. Styles
 *   2. Scripts
 *   3. Images
 *   4. Fonts
 *   5. Jekyll
 *   6. Style Guide
 *   7. Misc.
 */

// Define variables.
const accessibility = require('gulp-accessibility');
const appendPrepend = require('gulp-append-prepend');
const autoprefixer = require('autoprefixer');
const babel = require('gulp-babel');
const browserSync = require('browser-sync').create();
const cache = require('gulp-cache');
const cleancss = require('gulp-clean-css');
const concat = require('gulp-concat');
const del = require('del');
const gulp = require('gulp');
const gutil = require('gulp-util');
const imagemin = require('gulp-imagemin');
const jpegRecompress = require('imagemin-jpeg-recompress');
const notify = require('gulp-notify');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const run = require('gulp-run');
const runSequence = require('run-sequence');
const sass = require('gulp-ruby-sass');
const uglify = require('gulp-uglify');
const argv = require('yargs').argv;

// Include paths.
const paths = require('./_assets/gulp_config/paths');

/**
 * Compiles and places a CSS file.
 *
 * @param scssRoot
 *   The SCSS root file, e.g. 'styles.scss'.
 * @param destinations
 *   An array of destinations where the resulting CSS file should be placed.
 */
function buildStyles(scssRoot, destinations) {
  let stream = sass(paths.sassFiles + scssRoot, {
    style: 'compressed',
    trace: true,
    loadPath: [paths.sassFiles]
  });
  stream.pipe(postcss([autoprefixer({browsers: ['last 2 versions']})]))
    .pipe(cleancss());

  // Pipe file to all destinations.
  for (let i = 0; i < destinations.length; i++) {
    stream = stream.pipe(gulp.dest(destinations[i]));
  }

  stream.pipe(browserSync.stream())
    .on('error', gutil.log);
}

/**
 * Deletes the specified items.
 *
 * @param callback
 * @param items
 *   An array of items to be deleted.
 */
function clean (callback, items) {
  del.sync(items);
  callback();
}

// -----------------------------------------------------------------------------
//   1: Styles
// -----------------------------------------------------------------------------

/**
 * Task: build:styles:main
 *
 * Uses Sass compiler to process styles, adds vendor prefixes, minifies, then
 * outputs file to the appropriate location.
 */
const mainStyleDests = [
  paths.jekyllCssFiles,
  paths.siteCssFiles,
  paths.siteStyleGuide
];
gulp.task('build:styles:main', function () {
  buildStyles('/main.scss', mainStyleDests);
});

/**
 * Task: build:styles:critical
 *
 * Processes critical CSS, to be included in head.html.
 */
const criticalStyleDests = ['_includes/css'];
gulp.task('build:styles:critical', function () {
  buildStyles('/critical*.scss', criticalStyleDests);
});

/**
 * Task: build:styles:css
 *
 * Copies any other CSS files to the assets directory, to be used by pages/posts
 * that specify custom CSS files.
 */
gulp.task('build:styles:css', function () {
  return gulp.src([paths.sassFiles + '/*.css'])
    .pipe(postcss([autoprefixer({browsers: ['last 2 versions']})]))
    .pipe(cleancss())
    .pipe(gulp.dest(paths.jekyllCssFiles))
    .pipe(gulp.dest(paths.siteCssFiles))
    .on('error', gutil.log);
});

/**
 * Task: build:styles
 *
 * Builds all site styles.
 */
gulp.task('build:styles', [
  'build:styles:main',
  'build:styles:critical',
  'build:styles:css'
]);

/**
 * Task: clean:styles
 *
 * Deletes all processed site styles.
 */
const removeStyles = [paths.jekyllCssFiles, paths.siteCssFiles, '_includes/critical.css'];
gulp.task('clean:styles', function(callback) {
  clean(callback, removeStyles);
});

/**
 * Task: build:styles:styleguide
 *
 * Generates CSS for the style guide.
 */
const styleguideStyleDests = [
  paths.styleGuideAssets,
  'styleguide',
  paths.siteStyleGuide
];
gulp.task('build:styles:styleguide', function () {
  buildStyles('/styleguide.scss', styleguideStyleDests);
});

// -----------------------------------------------------------------------------
//   2: Scripts
// -----------------------------------------------------------------------------

/**
 * Task: build:scripts:global
 *
 * Concatenates and uglifies global JS files and outputs result to the
 * appropriate location.
 */
gulp.task('build:scripts:global', function () {
  return gulp.src([
    paths.jsFiles + '/global/lib' + paths.jsPattern,
    paths.jsFiles + '/global/*.js'
  ])
    .pipe(concat('main.js'))
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(uglify())

    // Only place in `assets` because Jekyll needs to process the file.
    .pipe(gulp.dest(paths.jekyllJsFiles))
    .on('error', gutil.log);
});

/**
 * Task: build:scripts:webpack
 *
 * Special task for running webpack to compile React code for comments app for
 * production.
 */
gulp.task('build:scripts:webpack', function () {
  return gulp.src('')
    .pipe(run('npm run build-comments'));
});

/**
 * Task: build:scripts:webpack:dev
 *
 * Special task for running webpack to compile React code for comments app for
 * development.
 */
gulp.task('build:scripts:webpack:dev', function () {
  return gulp.src('')
    .pipe(run('npm run build-comments-dev'));
});

/**
 * Task: build:scripts:comments
 *
 * Copies comments app to the assets directory.
 */
gulp.task('build:scripts:comments', function () {
  return gulp.src([
    paths.jsFiles + '/comments.js'
  ])
    // We need to add front matter so Jekyll will process variables.
    .pipe(appendPrepend.prependFile('./_assets/gulp_config/front-matter.txt'))

    // Only place in `assets` because Jekyll needs to process the file.
    .pipe(gulp.dest(paths.jekyllJsFiles))
    .on('error', gutil.log);
});

/**
 * Task: build:scripts:leaflet
 *
 * Concatenates and uglifies leaflet JS files and outputs result to the
 * appropriate location.
 */
gulp.task('build:scripts:leaflet', function () {
  return gulp.src([
    paths.jsFiles + '/leaflet/leaflet.js',
    paths.jsFiles + '/leaflet/leaflet-providers.js'
  ])
    .pipe(concat('leaflet.js'))
    .pipe(uglify())
    .pipe(gulp.dest(paths.jekyllJsFiles))
    .pipe(gulp.dest(paths.siteJsFiles))
    .on('error', gutil.log);
});

/**
 * Task: build:scripts
 *
 * Builds all scripts.
 */
gulp.task('build:scripts', function (callback) {
  runSequence('build:scripts:webpack',
    ['build:scripts:global', 'build:scripts:comments', 'build:scripts:leaflet'],
    callback);
});

/**
 * Task: build:scripts:dev
 *
 * Builds all scripts, running webpack for dev environment.
 */
gulp.task('build:scripts:dev', function (callback) {
  runSequence('build:scripts:webpack:dev',
    ['build:scripts:global', 'build:scripts:comments', 'build:scripts:leaflet'],
    callback);
});

/**
 * Task: clean:scripts
 *
 * Deletes all processed scripts.
 */
const removeScripts = [paths.jekyllJsFiles, paths.siteJsFiles];
gulp.task('clean:scripts', function(callback) {
  clean(callback, removeScripts);
});

// -----------------------------------------------------------------------------
//   3: Images
// -----------------------------------------------------------------------------

/**
 * Task: build:images
 *
 * Copies image files.
 */
gulp.task('build:images', function () {
  return gulp.src(paths.imageFilesGlob)
    .pipe(gulp.dest(paths.jekyllImageFiles))
    .pipe(gulp.dest(paths.siteImageFiles))
    .pipe(browserSync.stream());
});


/**
 * Task: build:images
 *
 * Optimizes image files. Note that this task does not run automatically.
 *
 * We're including imagemin options because we're overriding the default JPEG
 * optimization plugin.
 */
gulp.task('optimize:images', function () {
  return gulp.src(paths.imageFilesGlob)
    .pipe(cache(imagemin([
      imagemin.gifsicle(),
      jpegRecompress(),
      imagemin.optipng(),
      imagemin.svgo()
    ])))
    .pipe(gulp.dest(paths.imageFiles));
});

/**
 * Task: clean:images
 *
 * Deletes all processed images.
 */
const removeImages = [paths.jekyllImageFiles, paths.siteImageFiles];
gulp.task('clean:images', function(callback) {
  clean(callback, removeImages);
});

// -----------------------------------------------------------------------------
//   4: Fonts
// -----------------------------------------------------------------------------

/**
 * Task: build:fonts
 *
 * Copies fonts.
 */
gulp.task('build:fonts', ['fontawesome']);

/**
 * Task: fontawesome
 *
 * Places Font Awesome fonts in the proper location.
 */
gulp.task('fontawesome', function () {
  return gulp.src(paths.fontFiles + '/font-awesome/**.*')
    .pipe(rename(function (path) {
      path.dirname = '';
    }))
    .pipe(gulp.dest(paths.jekyllFontFiles))
    .pipe(browserSync.stream())
    .on('error', gutil.log);
});

/**
 * Task: clean:fonts
 *
 * Deletes all processed fonts.
 */
const removeFonts = [paths.jekyllFontFiles, paths.siteFontFiles];
gulp.task('clean:fonts', function(callback) {
  clean(callback, removeFonts);
});

// -----------------------------------------------------------------------------
//   5: Jekyll
// -----------------------------------------------------------------------------

/**
 * Task: build:jekyll
 *
 * Runs the jekyll build command.
 */
gulp.task('build:jekyll', function () {
  const shellCommand = 'bundle exec jekyll build --config _config.yml';

  return gulp.src('')
    .pipe(run(shellCommand))
    .on('error', gutil.log);
});

/**
 * Task: build:jekyll:test
 *
 * Runs the jekyll build command using the test config file.
 */
gulp.task('build:jekyll:test', function () {
  const shellCommand = 'bundle exec jekyll build --future --config _config.yml,_config.test.yml';

  return gulp.src('')
    .pipe(run(shellCommand))
    .on('error', gutil.log);
});

/**
 * Task: build:jekyll:local
 *
 * Runs the jekyll build command using the test and local config files.
 */
gulp.task('build:jekyll:local', function () {
  const shellCommand = 'bundle exec jekyll build --future --config _config.yml,_config.test.yml,_config.dev.yml';

  return gulp.src('')
    .pipe(run(shellCommand))
    .on('error', gutil.log);
});

/**
 * Task: clean:jekyll
 *
 * Deletes the entire _site directory.
 */
const removeSite = ['_site'];
gulp.task('clean:jekyll', function(callback) {
  clean(callback, removeSite);
});

/**
 * Task: clean
 *
 * Runs all the clean commands.
 */
gulp.task('clean', ['clean:jekyll',
  'clean:fonts',
  'clean:images',
  'clean:scripts',
  'clean:styles',
  'clean:styleguide']);

/**
 * Task: build
 *
 * Build the site anew. Assumes images are cached by Travis.
 */
gulp.task('build', function (callback) {
  runSequence('clean',
    ['build:scripts', 'build:images', 'build:styles', 'build:fonts'],
    'styleguide',
    'build:jekyll',
    callback);
});

/**
 * Task: build:test
 *
 * Builds the site anew using test config.
 */
gulp.task('build:test', function (callback) {
  runSequence('clean',
    ['build:scripts', 'build:images', 'build:styles', 'build:fonts'],
    'styleguide',
    'build:jekyll:test',
    callback);
});

/**
 * Task: build:local
 *
 * Builds the site anew using test and local config.
 */
gulp.task('build:local', function (callback) {
  runSequence('clean',
    ['build:scripts:dev', 'build:images', 'build:styles', 'build:fonts'],
    'styleguide',
    'build:jekyll:local',
    callback);
});

/**
 * Task: default
 *
 * Builds the site anew.
 */
gulp.task('default', ['build']);

/**
 * Task: build:jekyll:watch
 *
 * Special task for building the site then reloading via BrowserSync.
 */
gulp.task('build:jekyll:watch', ['build:jekyll:local'], function (callback) {
  browserSync.reload();
  callback();
});

/**
 * Task: build:scripts:watch
 *
 * Special task for building scripts then reloading via BrowserSync.
 */
gulp.task('build:scripts:watch', ['build:scripts:dev'], function (callback) {
  runSequence('build:jekyll:local');
  browserSync.reload();
  callback();
});

/**
 * Task: serve
 *
 * Static Server + watching files.
 *
 * Note: passing anything besides hard-coded literal paths with globs doesn't
 * seem to work with gulp.watch().
 */
gulp.task('serve', function () {
  // Only rebuild site if --rebuild option is passed to serve command.
  if (argv.rebuild !== undefined) {
    runSequence('build:local', 'watch');
  } else {
    runSequence('watch');
  }
});

gulp.task('watch', function () {
  browserSync.init({
    server: paths.siteDir,
    ghostMode: false, // Toggle to mirror clicks, reloads etc. (performance)
    logFileChanges: true,
    logLevel: 'debug',
    open: true // Toggle to automatically open page when starting.
  });

  // Watch site settings.
  gulp.watch(['_config*.yml'], ['build:jekyll:watch']);

  // Watch .scss files; changes are piped to browserSync.
  // Ignore style guide SCSS.
  // Rebuild the style guide to catch updates to component markup.
  gulp.watch(
    ['_assets/styles/**/*.scss', '!_assets/styles/scss/07-styleguide/**/*', '!_assets/styles/styleguide.scss'],
    ['build:styles', 'build:styleguide']
  );

  // Watch .js files.
  gulp.watch(
    ['_assets/js/**/*.js', '_comments-app/app/**/*'],
    ['build:scripts:watch']
  );

  // Watch comment app files.
  gulp.watch('_comments-app/**/*', ['build:scripts:watch']);

  // Watch image files; changes are piped to browserSync.
  gulp.watch('_assets/img/**/*', ['build:images']);

  // Watch posts.
  gulp.watch('_posts/**/*.+(md|markdown|MD)', ['build:jekyll:watch']);

  // Watch drafts if --drafts flag was passed.
  if (module.exports.drafts) {
    gulp.watch('_drafts/*.+(md|markdown|MD)', ['build:jekyll:watch']);
  }

  // Watch HTML and markdown files.
  gulp.watch(
    ['**/*.+(html|md|markdown|MD)', '!_site/**/*.*', '!_styleguide_assets/**/*.*', '!_assets/styles/*.md'],
    ['build:jekyll:watch']
  );

  // Watch RSS feed XML files.
  gulp.watch('**.xml', ['build:jekyll:watch']);

  // Watch data files.
  gulp.watch('_data/**.*+(yml|yaml|csv|json)', ['build:jekyll:watch']);

  // Watch favicon.png.
  gulp.watch('favicon.png', ['build:jekyll:watch']);

  // Watch style guide SCSS.
  gulp.watch(
    ['_assets/styles/styleguide.scss', '_assets/styles/scss/07-styleguide/**/*.scss'],
    ['build:styles:styleguide']
  );

  // Watch style guide HTML.
  gulp.watch(
    ['_styleguide_assets/*.html', '_assets/styles/*.md'],
    ['build:styleguide', 'build:jekyll:watch']
  );
});

// -----------------------------------------------------------------------------
//   6: Style Guide
// -----------------------------------------------------------------------------

/**
 * Task: styleguide
 *
 * Creates the style guide within the _site directory.
 */
gulp.task('styleguide', function (callback) {
  runSequence('clean:styleguide',
    'build:styles:styleguide',
    'build:styleguide',
    callback);
});

/**
 * Task: build:styleguide
 *
 * Builds the style guide via the hologram gem.
 */
gulp.task('build:styleguide', function () {
  const shellCommand = 'hologram -c hologram_config.yml';

  return gulp.src('')
    .pipe(run(shellCommand))
    .on('error', gutil.log);
});

/**
 * Task: clean:styleguide
 *
 * Deletes the entire _site/styleguide directory.
 */
gulp.task('clean:styleguide', function (callback) {
  del(['styleguide', '_site/styleguide']);
  callback();
});

// -----------------------------------------------------------------------------
//   7: Misc.
// -----------------------------------------------------------------------------

/**
 * Task: update:gems
 *
 * Updates Ruby gems.
 */
gulp.task('update:gems', function () {
  return gulp.src('')
    .pipe(run('bundle install'))
    .pipe(run('bundle update'))
    .pipe(notify({message: 'Bundle Update Complete'}))
    .on('error', gutil.log);
});

/**
 * Task: cache-clear
 *
 * Clears the gulp cache. Currently this just holds processed images.
 */
gulp.task('cache-clear', function (done) {
  return cache.clearAll(done);
});

/**
 * Task: accessibility-test
 *
 * Runs the accessibility test against WCAG standards.
 *
 * Tests we're ignoring and why:
 *   1. WCAG2A.Principle1.Guideline1_3.1_3_1.H49.I: it's common practice (and,
 *   arguably, more semantic) to use <i> for icons.
 *   2. WCAG2A.Principle1.Guideline1_3.1_3_1.H48: This is throwing a false
 *   positive. We have marked up our menus as unordered lists.
 *   3. WCAG2A.Principle1.Guideline1_3.1_3_1.H49.AlignAttr: Sadly, we must
 *   ignore this test if we are to use our emoji plugin.
 *   4. WCAG2A.Principle1.Guideline1_3.1_3_1.H73.3.NoSummary: We can't use
 *   table summaries in kramdown in our blog posts.
 *   5. WCAG2A.Principle1.Guideline1_3.1_3_1.H39.3.NoCaption: We can't use
 *   table captions in kramdown in our blog posts.
 *   6. WCAG2A.Principle1.Guideline1_3.1_3_1.H42: This throws a lot of false
 *   positives for text that should not be headings.
 *
 * We're also skipping redirect pages like /news/* and /team/*.
 */
gulp.task('accessibility-test', function () {
  return gulp.src(paths.htmlTestFiles)
    .pipe(accessibility({
      force: false,
      accessibilityLevel: 'WCAG2A',
      reportLevels: {notice: false, warning: true, error: true},
      ignore: [
        'WCAG2A.Principle1.Guideline1_3.1_3_1.H49.I',
        'WCAG2A.Principle1.Guideline1_3.1_3_1.H48',
        'WCAG2A.Principle1.Guideline1_3.1_3_1.H49.AlignAttr',
        'WCAG2A.Principle1.Guideline1_3.1_3_1.H73.3.NoSummary',
        'WCAG2A.Principle1.Guideline1_3.1_3_1.H39.3.NoCaption',
        'WCAG2A.Principle1.Guideline1_3.1_3_1.H42'
      ]
    }))
    .on('error', gutil.log);
});
