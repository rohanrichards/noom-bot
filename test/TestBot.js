var logger = require('winston');

exports.Bot = function() {
	this.user = {
		id: 1
	};
};

exports.Message = function() {
	this.author = '""';
	this.content = '';
	this.id = '';
	this.channel = new exports.Channel(this);
	this.awaitReactions = function() {
		logger.info('awaiting reactions');
		return Promise.resolve(this);
	};
	this.clearReactions = function() {
		logger.info('clearing reactions');
		return Promise.resolve(this);
	};
	this.react = function() {
		logger.info('reacting');
		return Promise.resolve(this);
	};

};

exports.Channel = function() {
	this.send = function(content) {
		logger.info(content);
		var message = new exports.Message();
		return Promise.resolve(message);
	};
};

exports.Reaction = function(message) {
	this.count = 0;
	this.emoji = new exports.ReactionEmoji();
	this.message = message;
	this.users = [];
};

exports.ReactionEmoji = function(reaction) {
	this.id = 0;
	this.name = '';
	this.reaction = reaction;
};
