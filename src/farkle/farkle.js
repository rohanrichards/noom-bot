'use strict';

var logger = require('winston'),
	_ = require('lodash');

const WINNING_SCORE = 1500,
	NUMBER_OF_ROUNDS = 1,
	DICE_SIDES = {
		'0': '0⃣',
		'1': '1⃣',
		'2': '2⃣',
		'3': '3⃣',
		'4': '4⃣',
		'5': '5⃣',
		'6': '6⃣',
		'7': '7⃣',
		'8': '8⃣',
		'9': '9⃣'
	},
	JOIN_REACTION = '🖐',
	DICE_SELECTIONS = [
		{
			emoji: '🇦',
			index: 0
		},
		{
			emoji: '🇧',
			index: 1
		},
		{
			emoji: '🇨',
			index: 2
		},
		{
			emoji: '🇩',
			index: 3
		},
		{
			emoji: '🇪',
			index: 4
		}],
	TURN_REACTIONS = [
		'✅',
		'🔚'
	],
	ALLOWED_REACTIONS = [
		'🇦',
		'🇧',
		'🇨',
		'🇩',
		'🇪',
		'✅',
		'🔚'
	];

var Player = function (player) {
	this.id = player.id;
	this.username = player.username;
	this.totalScore = 0;
	this.currentScore = 0;
	this.storedDice = 0;
	this.scoringDice = [];
	this.diceRolls = [];
};

var Farkle = function (discordBot) {
	this._discordBot = discordBot;
	this.botUser = this._discordBot.user;
	this.players = {};
	this.currentPlayer;
	this.matchOwner;
	this.maxScore = WINNING_SCORE;
	this.rounds = NUMBER_OF_ROUNDS;
	//the channel the bot and players are in
	this.mainChannel;

	this.newGame = function (message, args) {
		this.matchOwner = message.author;
		this.mainChannel = message.channel;
		this.args = args;
		//announce a game is Starting

		this.mainChannel.send('I\'m starting a game of Farkle, who\'s in?')
			.then(message => {
				var filter = (reaction, user) => reaction.emoji.name === JOIN_REACTION && user.id != this.botUser.id;
				message.react(JOIN_REACTION);
				message.awaitReactions(filter, { time: 5000 })
					.then(collectedReactions => {
						logger.info('got reactions: ', collectedReactions.size, ' (should only be one!)');
						collectedReactions.forEach(reaction => {
							this.players = reaction.users.filter(user => user.id !== this.botUser.id);
							this.players = this.players.map((player) => {
								return new Player(player);
							});
						});
						this.startGame();
					});
			})
			.catch(err => {
				logger.error(err);
			});
	};

	this.startGame = function () {
		logger.info('Players: ');
		this.players.forEach(user => {
			logger.info(user.username);
		});

		this.mainChannel.send(`Alright! Let's play some Funkin' Farkle!`);
		this.currentPlayer = this.players[0];
		this.turnCycle();
	};

	this.turnCycle = function (redraw) {
		var content = '',
			scoreString = `Total Score: ${this.currentPlayer.totalScore} / ${this.maxScore}\nRound Score: ${this.currentPlayer.currentScore}`;

		if(redraw){
			//set message
			content = `${redraw}\n${scoreString}`;
		}else {
			//set message
			content = `Your turn\n${scoreString}`;
			//roll dice
			this.currentPlayer.diceRolls = this.rollDice();
		}
		this.mainChannel.send(content, { reply: this.currentPlayer.id })
			.then(message => {
				this.drawDice(message.channel)
					.then(message => {
						//check if this.currentPlayer bust
						if (this.checkIfBust()) {
							this.bust();
							return;
						}

						this.listenForReactions(message).then(ready => {
							if(ready){
								this.sendDiceReactions(message, this.currentPlayer.diceRolls, 0);
							}
						});
					});
			});
	};

	this.listenForReactions = function (message) {
		return this.mainChannel.send('Current Dice Value: 0').then((diceValueMessage) => {
			var collector = message.createReactionCollector(() => true),
				listenerIsPaused = false;

			var reactionListener = setInterval(() => {
				var reactions = collector.collected,
					currentScore = this.reactionsToScore(reactions),
					scoreString = `Current Dice Value: ${currentScore}`;

				if(diceValueMessage.content != scoreString && !listenerIsPaused){
					listenerIsPaused = true;
					return diceValueMessage.edit(`Current Dice Value: ${currentScore}`).then(() => {
						listenerIsPaused = false;
					});
				}else {
					return Promise.resolve(false);
				}
			}, 100);

			collector.on('collect', (reaction) => {
				//clean it up first
				reaction = this.cleanReaction(reaction);

				var endTurnType = this.isEndTurnReaction(reaction);
				if (endTurnType) {
					collector.stop(endTurnType);
					message.clearReactions();
				}
			});

			collector.on('end', (elements, reason) => {
				clearInterval(reactionListener);

				//remove the 'ok' or 'end' reaction
				elements.delete(elements.lastKey());

				if(this.reactionsToScore(elements) === 0){
					//current selected dice give no score
					this.turnCycle('You must select at least one scoring dice!');
					return;
				}

				//calculate score from elements (if any)
				this.updatePlayerScoreFromDice(elements);

				logger.info('player score updated, ending turn with reason: ', reason);
				if (reason === 'stop') {
					//player had no score so they are passing
					this.pass();
				} else {
					//player scored something (stored dice)
					//player did not bust or pass
					this.turnCycle();
				}
			});

			return true;
		});
	};

	this.updatePlayerScoreFromDice = function(reactions) {
		logger.info('got reactions: ', reactions.size);
		var dice = this.reactionsToDice(reactions);
		logger.info('got dice: ', dice, ' of length: ', dice.length);

		var score = this.getDiceValue(dice);
		var nonScoring = this.getNonScoringDice(dice);
		logger.info('non scoring dice: ', nonScoring.length);
		this.currentPlayer.storedDice += (dice.length - nonScoring.length);
		logger.info('currently stored dice: ', this.currentPlayer.storedDice);
		this.currentPlayer.currentScore += score;
	};

	this.reactionsToScore = function(reactions) {
		var diceValue = 0;
		var cleanedReactions = this.removeBotReactions(reactions);

		if(cleanedReactions.size) {
			var dice = this.reactionsToDice(reactions);
			diceValue = this.getDiceValue(dice);
		}

		return diceValue;
	};

	this.removeBotReactions = function (reactions) {
		//get rid of bots reactions from a collection of reactions
		reactions.forEach((reaction, index, collection) => {
			var users = reaction.users.filter(user => user.id !== this.botUser.id);
			if (users.size == 0) {
				collection.delete(index);
			}
		});
		return reactions;
	};

	this.isEndTurnReaction = function (reaction) {
		var endType = null;
		reaction.users.forEach((user) => {
			if (reaction.emoji.name == ALLOWED_REACTIONS[5] && user.id === this.currentPlayer.id) {
				//if the user presses the OK button to continue their turn
				endType = 'continue';
				return false;
			} else if (reaction.emoji.name == ALLOWED_REACTIONS[6] && user.id === this.currentPlayer.id) {
				//if the user pressed the STOP button to end their turn
				endType = 'stop';
				return false;
			}
		});
		return endType;
	};

	//cleans up the reaction object by removing disallowed reactions
	//and reactions from incorrect users
	this.cleanReaction = function (reaction) {
		reaction.users.forEach((user) => {
			if (user.id !== this.currentPlayer.id && user.id !== this.botUser.id) {
				//remove reactions from users if its not their turn
				reaction.remove(user);
			} else if (!isAllowableEmoji(reaction.emoji.name)) {
				//make sure its an emoji the user is allowed to react with
				reaction.remove(user);
			}
		});
		return reaction;
	};

	this.reactionsToDice = function(reactions) {
		var dice = [];
		if (reactions.size == 0) {
			return dice;
		}

		reactions.forEach(reaction => {
			var el = _.find(DICE_SELECTIONS, (k) => { return k.emoji === reaction.emoji.name; });
			if(el) {
				var index = el.index;
				dice.push(this.currentPlayer.diceRolls[index]);
			}
		});

		return dice;
	};

	this.getDiceValue = function(dice){
		var scoreData = scoreDataFromDice(dice);

		return scoreData.score;
	};

	this.getNonScoringDice = function(dice) {
		var scoreData = scoreDataFromDice(dice);

		return scoreData.nonScoringDice;
	};

	function scoreDataFromDice(dice) {
		var counts = _.countBy(dice);
		var score = 0;

		_.forOwn(counts, (value, key) => {
			if (value === 4) {
				//four of a kind, remove those dice from storedDice
				// logger.info('four of a kind: ', key);
				dice = dice.filter((die) => { return die != key; });
				score += 1000;
				return false;
			} else if (value === 3) {
				//three of a kind, remove those dice from storedDice
				// logger.info('three of a kind: ', key);
				dice = dice.filter((die) => { return die != key; });
				score += 500;
				return false;
			}
		});

		var ones = dice.filter(die => die === 1);
		for (var i = 0; i < ones.length; i++) {
			//remove all the ones from the dice array;
			dice = dice.filter((die) => { return die !== 1; });
			score += 100;
		}

		var fives = dice.filter(die => die === 5);
		for (var x = 0; x < fives.length; x++) {
			//remove all the fives from the dice array;
			dice = dice.filter((die) => { return die !== 5; });
			score += 50;
		}

		return {
			'score': score,
			'nonScoringDice': dice
		};
	}


	this.pass = function () {
		logger.info('player passed');
		this.currentPlayer.totalScore += this.currentPlayer.currentScore;
		this.currentPlayer.currentScore = 0;
		this.currentPlayer.storedDice = 0;
		this.currentPlayer.scoringDice.length = 0;
		this.currentPlayer.diceRolls.length = 0;
		if (this.checkIfCurrentPlayerWins()) {
			return;
		} else {
			this.nextPlayersTurn();
		}
	};

	this.checkIfCurrentPlayerWins = function () {
		if (this.currentPlayer.totalScore >= this.maxScore) {
			this.playerWon(this.currentPlayer);
			return true;
		}
	};

	function isAllowableEmoji(emoji) {
		if (Object.keys(ALLOWED_REACTIONS)
			.some(k => ALLOWED_REACTIONS[k] === emoji)) {
			return true;
		} else {
			return false;
		}
	}

	this.rollDice = function() {
		if (this.currentPlayer.storedDice >= 5) {
			this.currentPlayer.storedDice = 0;
		}
		var dice = [];
		var diceCount = 5 - this.currentPlayer.storedDice;
		for (var i = 0; i < diceCount; i++) {
			dice[i] = getRandomInt(1, 6);
		}
		return dice;
	};

	function getRandomInt(min, max) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	this.checkIfBust = function () {
		var score = this.getDiceValue(this.currentPlayer.diceRolls);
		if(score){
			return false;
		}else{
			return true;
		}
	};

	this.bust = function () {
		this.mainChannel.send('Bust!', { reply: this.currentPlayer.id })
			.then(() => {
				this.currentPlayer.currentScore = 0;
				this.currentPlayer.storedDice = 0;
				this.currentPlayer.scoringDice.length = 0;
				this.currentPlayer.diceRolls.length = 0;
				this.nextPlayersTurn();
			});
	};

	this.drawDice = function (channel) {
		var dice = this.currentPlayer.diceRolls.map(number => {
			return DICE_SIDES[number];
		});

		var diceString = dice.reduce((acc, current) => {
			return `${acc}	${current}`;
		});

		return channel.send(diceString)
			.then(message => { return message; });
	};

	this.sendDiceReactions = function (message, rolls, index) {
		if (rolls[index] != null) {
			return message.react(DICE_SELECTIONS[index].emoji)
				.then(() => {
					this.sendDiceReactions(message, rolls, index + 1);
				});
		} else {
			logger.info('finished all reactions');
			message.react(TURN_REACTIONS[0])
				.then(() => message.react(TURN_REACTIONS[1]));
		}
	};

	this.nextPlayersTurn = function () {
		//find out who the next player is
		//maybe pop and push onto players array
		//start next turn with next player
		var nextPlayer = this.players.pop();
		this.players.unshift(nextPlayer);
		this.currentPlayer = nextPlayer;
		this.turnCycle();
	};

	this.playerWon = function (player) {
		//announce winner to the server
		this.mainChannel.send(`Wins!`, { reply: player.id });
		this.cleanup();
	};

	this.cleanup = function () {
		//remove any remaining listeners for messages
	};
};

module.exports = Farkle;
