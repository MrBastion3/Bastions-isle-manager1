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
  name: 'setslots',
  description: 'Sets the number of storage slots available for dinosaurs (Admin only).',
  adminOnly: true,
  execute(message, args, settings) {
    if (!message.member.permissions.has('ADMINISTRATOR')) {
      const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You do not have permission to use this command.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    if (args.length !== 1 || isNaN(args[0])) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Command')
        .setDescription('Please provide a valid number of slots.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    settings.slots = parseInt(args[0], 10);
    fs.writeFileSync(path.join(__dirname, '..', 'settings.json'), JSON.stringify(settings, null, 2));

    logger.info(`Slots set to ${args[0]} by ${message.author.tag}`);
    const embed = new EmbedBuilder()
      .setTitle('Slots Updated')
      .setDescription(`The number of slots has been set to ${args[0]}.`)
      .setColor('#0099ff');
    message.channel.send({ embeds: [embed] });
  },
};
