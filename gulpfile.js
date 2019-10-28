const { series, parallel, src, dest, watch } = require('gulp');
const del = require('del');
const gutil = require('gulp-util');
const inject = require('gulp-inject');
const browserSync = require('browser-sync');
const env = gutil.env.env;
const isProduction = env === 'prod';
var isBuild = false;

// Lib for ts, js
const browserify = require('browserify');
const source = require('vinyl-source-stream');
const tsify = require('tsify');


// Lib for css task
const sourcemap = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

// Lib for images
const imagemin = require('gulp-imagemin');
const cache = require('gulp-cache')

const paths = {
    files: {
        rootDist: 'dist/*',
        tmpDist: '.tmp/*',
        html: 'src/**/*.html',
        tmpCss: '.tmp/**/*.css',
        tmpJs: '.tmp/**/*.js',
        tmpIndex: '.tmp/index.html',
        scss: 'src/**/*.scss',
        ts: 'src/**/*.ts',
        srcIndex: 'src/index.html',
        images: 'assets/images/*'
    },
    tmp: {
        root: './.tmp', 
        rootDir: '.tmp',
        css: '.tmp/css',
        js: '.tmp/js',
        images: '.tmp/images'
    },
    src: {
        root: './src'
    },
    dist: {
        root: './dist',
        rootDir: 'dist',
        js: 'dist/js',
        css: 'dist/css',
        images: '.tmp/images'
    },
    options: {
        imagemin: { optimizationLevel: 3, progressive: true, interlaced: true }
    }
}

// Common tasks
const reload  = function(done) {
    browserSync.reload();
    done();
}

const clean = () => {
    var pathsClean = [];
    pathsClean.push(paths.files.tmpDist);

    if (isBuild) {
        pathsClean.push(paths.files.rootDist);
    }
    return del(pathsClean);
}

const serve = function(done) {
    const func = series(clean, copyTask, injectTask);
    
    return func(() => {
        browserSync.init({
            server: {
                baseDir: paths.tmp.root
            }
        });
        series(watchTask, reload)();
        done();
    })
}

const build = function(done) {
    isBuild = true;
    const funcExc = series(clean, copyTask, minifyCss, copyTmpToDist);

    return funcExc(() => {
        browserSync.init({
            server: {
                baseDir: paths.dist.root
            }
        });
        series(injectTask, reload)();
        done();
    });
}

const copyTmpToDist = () => {
    return src('.tmp/**/*')
    .pipe(dest(paths.dist.root));
}

const copyTask = (done) => {
    const func = parallel(processSCSS, processTS, processHtml, copyIndexFile, processImages);
    return func(() => {
        done();
    })
}

const watchTask = () => {
    return parallel(watchSCSS, watchTS, watchHtml, watchImages)();
}

// HTML compiler
const processHtml = () => {
    return src([paths.files.html, '!' + paths.files.srcIndex])
    .pipe(dest(paths.tmp.root))
    .pipe(browserSync.stream());
}

const copyIndexFile = () => {
    return src(paths.files.srcIndex)
    .pipe(dest(paths.tmp.root));
}

const injectTask = () => {
    const rootPath = !isBuild ? paths.tmp.rootDir : paths.dist.rootDir;
    const jsPath = rootPath + '/**/*.js';
    const cssPath = rootPath + '/**/*.css';
    return src('src/index.html')
    .pipe(inject(src(jsPath), {ignorePath: rootPath, addRootSlash: false}))
    .pipe(inject(src(cssPath), {ignorePath: rootPath, addRootSlash: false}))
    .pipe(dest(rootPath));
}

const watchHtml = () => {
    watch(paths.files.html, processHtml);
}

// SCSS compiler
const processSCSS = () => {
    return src(paths.files.scss)
    .pipe(sass())
    .pipe(sourcemap.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemap.write('.'))
    .pipe(dest(paths.tmp.css))
    .pipe(browserSync.stream());
}

const watchSCSS = () => {
    watch(paths.files.scss, processSCSS);
}

const minifyCss = () => {
    return src(paths.files.tmpCss)
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(dest(paths.tmp.root));
}

// TS Compiler
const processTS = () => {
    const production = env === 'prod';
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

const watchTS = () => {
    watch(paths.files.ts, processTS);
}

// Images task
const processImages = () => {
    return src(paths.files.images)
    .pipe(cache(imagemin(paths.options.imagemin)))
    .pipe(dest(paths.tmp.images));
}

const watchImages = () => {
    watch(paths.files.images, processImages);
}

exports.serve = serve;
exports.build = build;
exports.default = build;