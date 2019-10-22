const { series, parallel, src, dest, watch } = require('gulp');
const del = require('del');
const gutil = require('gulp-util');

// Lib for ts, js
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');

// const typescript = require('gulp-typescript');
// const tsProject = typescript.createProject('tsconfig.json');


// Lib for css task
const sourcemap = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

const browserSync = require('browser-sync');

const paths = {
    files: {
        rootDist: 'dist/*',
        tmpDist: '.tmp/*',
        html: 'src/**/*.html',
        css: '.tmp/css/*.css',
        js: '.tmp/js/*.js',
        scss: 'src/*.scss',
        ts: 'src/**/*.ts',
    },
    tmp: {
        root: './.tmp',
        css: '.tmp/css',
        js: '.tmp/js'
    },
    src: {
        css: 'src/css',
        js: 'src/js',
        root: './src'
    },
    dist: {
        root: './dist',
        js: 'dist/js',
        css: 'dist/css',
    }
}

const reload  = function() {
    browserSync.reload();
}

const cleanDist = function() {
    return del([paths.files.rootDist]);
}

const cleanTmp = function() {
    return del([paths.files.tmpDist]);
}

const copyHTML = function() {
    return src(paths.files.html)
    .pipe(dest(paths.dist.root));
}

const htmlTask = function() {
    return src(paths.files.html)
    .pipe(dest(paths.tmp.root))
    .pipe(browserSync.stream());
}

const watchHtml = function() {
    watch(paths.files.html, htmlTask);
}


// Processing for css
const transformScssToCss = function() {
    return src(paths.files.scss)
    .pipe(sourcemap.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemap.write('.'))
    .pipe(dest(paths.tmp.css))
    .pipe(browserSync.stream());
} 

const watchCss = function() {
    watch(paths.files.scss, transformScssToCss);
}

const minifyCss = function() {
    return src(paths.files.css)
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(dest(paths.dist.css));
}

const buildCss = function(cb) {
    series(transformScssToCss, minifyCss)();
    cb();
}

// Processing for js
const transformTSToJs = function() {
    const production = gutil.env.type = 'production';
    return browserify({
        basedir: '.',
        debug: !production,
        entries: ['src/main.ts'],
        cache: {},
        packageCache: {}
    })
    .plugin(tsify)
    .bundle()
    .pipe(source('main.js'))
    .pipe(dest(paths.tmp.js))
    .pipe(browserSync.stream());
}

const watchJS = function() {
    watch(paths.files.ts, transformTSToJs);
}

const copyJs = function() {
    return src(paths.files.js)
    .pipe(dest(paths.dist.js));
}

const buildJS = function(cb) {
    console.log('buildJs called...');
    series(transformTSToJs, copyJs)();
    cb();
}

const watchTask = function() {
    browserSync.init({
        server: {
            baseDir: paths.tmp.root
        }
    });

    series(cleanTmp)();
    series(transformScssToCss, watchCss, reload)();
    series(transformTSToJs, watchJS,  reload)();
    series(htmlTask, watchHtml, reload)();
}

const build = function(cb) {
    browserSync.init({
        server: {
            baseDir: paths.dist.root
        }
    });
    series(cleanDist, parallel(copyHTML, buildCss, buildJS), reload)();
    cb();
}

exports.build = build;

exports.default = watchTask;





// Js Task
// const browserifyTask = function() {
//     return browserify({
//         basedir: '.',
//         debug: true,
//         entries: ['src/main.ts'],
//         cache: {},
//         packageCache: {}
//     })
//     .plugin(tsify)
//     .bundle()
//     .pipe(source('bundle.js'))
//     .pipe(dest(outputs.dest))
//     .pipe(browserSync.stream());
// }

