var gulp = require('gulp');
var builder = require("systemjs-builder");
var fs = require("fs");
var run = require('gulp-run');
var rename = require("gulp-rename");

gulp.task('default', ['dist'], function() {
});

gulp.task('dist', ['build'], function() {
    // mop: ye ye...evil but i am lazy
    if (!fs.existsSync("dist")) {
        fs.mkdirSync("dist");
    }
    
    gulp.src('./kamelladjutant.js')
        .pipe(gulp.dest('dist'));

    gulp.src('css/*')
        .pipe(gulp.dest('dist/css'));
    
    gulp.src('fonts/*')
        .pipe(gulp.dest('dist/fonts'));

    
    run("./create-dist-index.sh").exec()
        .pipe(rename("index.html"))
        .pipe(gulp.dest("dist"));
});

gulp.task('build', function(done) {
    builder.loadConfig("config.js")
    .then(function() {
        builder.buildSFX('js/app.jsx!', 'kamelladjutant.js', {"minify": true})
            .then(done)
            .catch(done)
        ;
    });
});
