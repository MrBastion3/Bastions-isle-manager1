const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');

module.exports = {
  name: 'dice',
  description: 'Gamble your points using dice. Roll a total over 10 to win 4 times your original bet. Minimum bet is 100, maximum bet is 5000.',
  async execute(message, args, settings) {
    const minBet = 100;
    const maxBet = 5000;
    const userId = message.author.id;

    if (args.length !== 1 || isNaN(args[0])) {
      return message.channel.send(`🎲 Please provide a valid amount to bet. Minimum bet is ${minBet}, maximum bet is ${maxBet}.`);
    }

    const betAmount = parseInt(args[0], 10);

    if (betAmount < minBet || betAmount > maxBet) {
      return message.channel.send(`🎲 Bet amount must be between ${minBet} and ${maxBet} points.`);
    }

    try {
      const userData = await readUserData(userId);
      const userPoints = userData.metadata.points;

      if (userPoints < betAmount) {
        return message.channel.send('❌ You do not have enough points to make this bet.');
      }

      const diceRolls = [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
      const totalRoll = diceRolls[0] + diceRolls[1];
      let resultMessage;
      let color;
      let winEmoji = '🎉';
      let loseEmoji = '💔';

      if (totalRoll > 10) {
        const winnings = betAmount * 4;
        userData.metadata.points += winnings;
        resultMessage = `${winEmoji} You rolled a 🎲 ${diceRolls[0]} and a 🎲 ${diceRolls[1]} for a total of ${totalRoll}! You win ${winnings} points! Your new balance is ${userData.metadata.points} points.`;
        color = '#00ff00';
      } else {
        userData.metadata.points -= betAmount;
        resultMessage = `${loseEmoji} You rolled a 🎲 ${diceRolls[0]} and a 🎲 ${diceRolls[1]} for a total of ${totalRoll}. You lose ${betAmount} points. Your new balance is ${userData.metadata.points} points.`;
        color = '#ff0000';
      }

      await writeUserData(userId, userData);

      const embed = new EmbedBuilder()
        .setTitle('🎲 Dice Roll Result')
        .setDescription(resultMessage)
        .setColor(color);

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Error executing dice command for user ${userId}:`, error);
      message.channel.send('⚠️ An error occurred while processing your dice roll. Please try again later.');
    }
  },
};
