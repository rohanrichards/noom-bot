module.exports = {
	'env': {
		'es6': true,
		'node': true,
		'mocha': true
	},
	'extends': 'eslint:recommended',
	'parserOptions': {
		'sourceType': 'module'
	},
	'rules': {
		'indent': [
			'error',
			'tab',
			{ 'SwitchCase': 1 }
		],
		'linebreak-style': [
			'error',
			'windows'
		],
		'quotes': [
			'error',
			'single',
			{ 'allowTemplateLiterals': true }
		],
		'semi': [
			'error',
			'always'
		],
		'no-console': [
			'warn'
		],
		'no-multi-spaces': [
			'warn'
		],
		'no-unused-vars': [
			'warn'
		]
	}
};
