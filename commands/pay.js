const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const winston = require('winston');
const path = require('path');
const fs = require('fs');

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

const settingsPath = path.join(__dirname, '..', 'settings.json');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

module.exports = {
  name: 'pay',
  description: 'Enables players to transfer currency to other users.',
  async execute(message, args) {
    if (args.length !== 2 || isNaN(args[1])) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Command')
        .setDescription('Please provide a valid user and amount.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid User')
        .setDescription('Please mention a valid user to pay.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const amount = parseInt(args[1], 10);
    const payerId = message.author.id;
    const payeeId = targetUser.id;

    try {
      const payerData = await readUserData(payerId);
      const payeeData = await readUserData(payeeId) || { metadata: { points: 0 } };

      if (!payerData || payerData.metadata.points < amount) {
        const embed = new EmbedBuilder()
          .setTitle('Insufficient Funds')
          .setDescription('You do not have enough points to make this payment.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      // Deduct points from payer
      payerData.metadata.points -= amount;
      
      // Add points to payee
      payeeData.metadata.points += amount;

      // Save updated data
      await writeUserData(payerId, payerData);
      await writeUserData(payeeId, payeeData);

      logger.info(`User ${message.author.tag} paid ${amount} points to ${targetUser.tag}`);
      const embed = new EmbedBuilder()
        .setTitle('Payment Successful')
        .setDescription(`You have paid ${amount} ${settings.currencyEmoji} to ${targetUser.tag}.`)
        .setColor('#0099ff');
      message.channel.send({ embeds: [embed] });

      const payeeEmbed = new EmbedBuilder()
        .setTitle('Payment Received')
        .setDescription(`You have received ${amount} ${settings.currencyEmoji} from ${message.author.tag}.`)
        .setColor('#0099ff');
      targetUser.send({ embeds: [payeeEmbed] });
    } catch (error) {
      logger.error(`Error processing payment from ${message.author.tag} to ${targetUser.tag}:`, error);
      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('An error occurred while processing the payment. Please try again later.')
        .setColor('#ff0000');
      message.channel.send({ embeds: [embed] });
    }
  },
};
