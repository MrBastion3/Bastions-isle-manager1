const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
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

module.exports = {
  name: 'setemoji',
  description: 'Sets the emoji used for the in-game currency (Admin only).',
  adminOnly: true,
  execute(message, args, settings) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You do not have permission to use this command.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    if (args.length !== 1) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Command')
        .setDescription('Please provide the emoji to set as the currency emoji.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    settings.currencyEmoji = args[0];
    fs.writeFileSync(path.join(__dirname, '..', 'settings.json'), JSON.stringify(settings, null, 2));

    logger.info(`Currency emoji set to ${args[0]} by ${message.author.tag}`);
    const embed = new EmbedBuilder()
      .setTitle('Currency Emoji Updated')
      .setDescription(`The currency emoji has been set to ${args[0]}.`)
      .setColor('#0099ff');
    message.channel.send({ embeds: [embed] });
  },
};
