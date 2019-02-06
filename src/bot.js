'use strict';

var Discord = require('discord.js'),
	logger = require('winston'),
	auth = require('./config/auth.js'),
	Commands = require('./commands.js');

var NoomBot = function () {
	const COMMAND_CHARACTER = '!';
	const COMMAND_START = 0;
	const COMMAND_LENGTH = 1;

	this._commands = {};
	// this._cleverbot = new cleverbot();
	this._discordBot = new Discord.Client();


	this._discordBot.on('ready', () => {
		logger.info('Connected');

		//fire up the commands module with a reference to the ready bot
		this._commands = new Commands(this._discordBot);
	});

	this._discordBot.on('message', message => {
		// Our bot needs to know if it will execute a command
		// It will listen for messages that will start with `!`
		if (message.content.substring(COMMAND_START, COMMAND_LENGTH) === COMMAND_CHARACTER) {
			this._commands.run(message);
		}
	});

	this._discordBot.login(auth.discord.BOT_USER_TOKEN).catch((err) => {
		logger.error(err);
	});
};

module.exports = NoomBot;
