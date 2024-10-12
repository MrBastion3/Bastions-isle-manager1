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
  name: 'setworkrange',
  description: 'Sets the range of points that can be earned from the work command (Admin only).',
  adminOnly: true,
  execute(message, args, settings) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You do not have permission to use this command.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    if (args.length !== 2 || isNaN(args[0]) || isNaN(args[1])) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Command')
        .setDescription('Please provide a valid min and max range of points.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const minPoints = parseInt(args[0], 10);
    const maxPoints = parseInt(args[1], 10);

    settings.work.minPoints = minPoints;
    settings.work.maxPoints = maxPoints;
    fs.writeFileSync(path.join(__dirname, '..', 'settings.json'), JSON.stringify(settings, null, 2));

    logger.info(`Work points range set to ${minPoints}-${maxPoints} by ${message.author.tag}`);
    const embed = new EmbedBuilder()
      .setTitle('Work Points Range Updated')
      .setDescription(`The range of points that can be earned from the work command has been set to ${minPoints} - ${maxPoints}.`)
      .setColor('#0099ff');
    message.channel.send({ embeds: [embed] });
  },
};
