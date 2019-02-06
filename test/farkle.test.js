var should = require('chai').should(),
	Farkle = require('../src/farkle/farkle.js'),
	FakeBot = require('./TestBot.js').Bot;


describe('getDiceValue()', function() {
	it('should return the point value of the dice', function() {
		var bot = new FakeBot(),
			farkle = new Farkle(bot),
			dice = [1, 1, 1, 1, 4],
			expected = 1000;

		var score = farkle.getDiceValue(dice);

		score.should.equal(expected);
	});
});

describe('getNonScoringDice()', function() {
	it('should return remaining non scoring dice', function() {
		var bot = new FakeBot(),
			farkle = new Farkle(bot),
			dice = [1, 1, 1, 4, 4],
			remainingDiceSample = [4, 4];

		var nonScoringDice = farkle.getNonScoringDice(dice);

		nonScoringDice.should.have.length(2);
		nonScoringDice.should.be.deep.equal(remainingDiceSample);
	});
});
