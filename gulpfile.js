'use strict';

var gulp = require('gulp'),
	nodemon = require('gulp-nodemon'),
	eslint = require('gulp-eslint');

gulp.task('lint', function () {
	return gulp.src('./src/*.js')
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

gulp.task('dev', function () {
	var stream = nodemon({
		script: 'index.js',
		extension: 'js',
		watch: [
			'./src/',
			'index'
		],
		tasks: ['lint']
	});

	stream
		.on('restart', function () {
			console.log('restarted!');
		})
		.on('crash', function () {
			console.error('App crashed!');
			stream.emit('restart', 10);
		});
});

gulp.task('default', ['lint', 'dev']);
