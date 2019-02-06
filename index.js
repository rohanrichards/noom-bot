var logger = require('winston'),
	NoomBot = require('./src/bot.js');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
	colorize: true
});
logger.level = 'debug';

logger.info('Starting up bot');
var bot = new NoomBot();
