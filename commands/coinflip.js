const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ],
});

const winEmoji = '🎉';
const loseEmoji = '😢';

module.exports = {
  name: 'coinflip',
  description: 'Flip a coin to win or lose points.',
  async execute(message, args, settings) {
    const userId = message.author.id;
    const betAmount = parseInt(args[0], 10);

    // Check if bet amount is valid
    if (isNaN(betAmount) || betAmount < 100) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Bet')
        .setDescription('The minimum bet is 100 points.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    if (betAmount > 5000) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Bet')
        .setDescription('The maximum bet is 5000 points.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    try {
      const userData = await readUserData(userId);

      if (userData.metadata.points < betAmount) {
        const embed = new EmbedBuilder()
          .setTitle('Insufficient Points')
          .setDescription('You do not have enough points to place this bet.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      const outcome = Math.random() < 0.5 ? 'win' : 'lose';
      let resultMessage;

      if (outcome === 'win') {
        userData.metadata.points += betAmount;
        resultMessage = `${winEmoji} You won ${betAmount} points! Your new balance is ${userData.metadata.points} ${settings.currencyEmoji}.`;
      } else {
        userData.metadata.points -= betAmount;
        resultMessage = `${loseEmoji} You lost ${betAmount} points. Your new balance is ${userData.metadata.points} ${settings.currencyEmoji}.`;
      }

      await writeUserData(userId, userData);

      const embed = new EmbedBuilder()
        .setTitle('Coin Flip Result')
        .setDescription(resultMessage)
        .setColor(outcome === 'win' ? '#00ff00' : '#ff0000');

      logger.info(`User ${message.author.tag} ${outcome} ${betAmount} points in a coin flip.`);
      message.channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error handling coin flip for user ${userId}: ${error}`);
      message.channel.send('There was an error processing your bet. Please try again later.');
    }
  },
};
