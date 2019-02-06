'use strict';

var logger = require('winston'),
	Farkle = require('./farkle/farkle.js');

var Commands = function (_discordBot) {
	this._discordBot = _discordBot;
	this._farkle = new Farkle(_discordBot);

	const COMMAND_LENGTH = 1;
	const DICE_ROLL_FROM = 1;
	const DEFAULT_DICE_ROLL_TO = 6;

	this.run = function (message) {
		//get first arg as command
		var content = message.content;
		var args = content.substring(COMMAND_LENGTH)
			.split(' ');
		var cmd = args[0];

		//remove command from args
		args = args.splice(COMMAND_LENGTH);

		//check command for available function
		switch (cmd) {
			case 'ping':
				message.channel.send('Pong!');
				break;
			case 'roll':
				this.rollDice(message, args[0]);
				break;
			case 'farkle':
				this._farkle.newGame(message, args);
				break;
			// default:
			// 	this._discordBot.send({
			// 		to: channelID,
			// 		message: `Sorry ${user}, I'm not sure what you want.`
			// 	})
		}
	};

	this.rollDice = function (message, sides) {
		message.channel.send(`${message.author.username}: **${getRandomInt(DICE_ROLL_FROM, (sides ? sides : DEFAULT_DICE_ROLL_TO))}**`);
	};
};

function getRandomInt(min, max) {
	const OFFSET = 1;
	return Math.floor(Math.random() * (max - min + OFFSET)) + min;
}

module.exports = Commands;
