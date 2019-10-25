const { series, parallel, src, dest, watch } = require('gulp');
const del = require('del');
const gutil = require('gulp-util');
const inject = require('gulp-inject');
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

const browserSync = require('browser-sync');

const paths = {
    files: {
        rootDist: 'dist/*',
        html: 'src/**/*.html',
        tmpDist: '.tmp/*',
        tmpCss: '.tmp/**/*.css',
        tmpJs: '.tmp/**/*.js',
        tmpIndex: '.tmp/index.html',
        scss: 'src/**/*.scss',
        ts: 'src/**/*.ts',
    },
    tmp: {
        root: './.tmp',
        css: '.tmp/css',
        js: '.tmp/js'
    },
    src: {
        root: './src'
    },
    dist: {
        root: './dist',
        js: 'dist/js',
        css: 'dist/css',
    }
}

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
    .pipe(dest('dist'));
}

const copyTask = (done) => {
    const func = parallel(processSCSS, processTS, processHtml, copyIndexFile);
    return func(() => {
        done();
    })
}

const watchTask = () => {
    return parallel(watchSCSS, watchTS, watchHtml)();
}


const injectTask = () => {
    const rootPath = !isBuild ? '.tmp' : 'dist';
    const jsPath = rootPath + '/**/*.js';
    const cssPath = rootPath + '/**/*.css';

    console.log('inject task called ---------');
    console.log(jsPath);
    console.log(cssPath);

    return src('src/index.html')
    .pipe(inject(src(jsPath), {ignorePath: rootPath, addRootSlash: false}))
    .pipe(inject(src(cssPath), {ignorePath: rootPath, addRootSlash: false}))
    .pipe(dest(rootPath));
}

const processSCSS = () => {
    return src(paths.files.scss)
    .pipe(sass())
    .pipe(sourcemap.init())
    .pipe(sass().on('error', sass.logError))
    .pipe(sourcemap.write('.'))
    .pipe(dest(paths.tmp.css))
    .pipe(browserSync.stream());
}

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

const processHtml = () => {
    return src([paths.files.html, '!src/index.html'])
    .pipe(dest(paths.tmp.root))
    .pipe(browserSync.stream());
}

const copyIndexFile = () => {
    return src('src/index.html')
    .pipe(dest(paths.tmp.root));
}

const watchSCSS = () => {
    watch(paths.files.scss, processSCSS);
}

const watchTS = () => {
    watch(paths.files.ts, processTS);
}


const watchHtml = () => {
    watch(paths.files.html, processHtml);
}


const minifyCss = () => {
    return src(paths.files.tmpCss)
    .pipe(postcss([autoprefixer(), cssnano()]))
    .pipe(dest(paths.tmp.root));
}


exports.serve = serve;
exports.build = build;
exports.default = build;

exports.processSCSS = processSCSS;