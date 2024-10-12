const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const settings = require('../settings.json'); // Load settings
const config = require('../config.js'); // Load config
const permissionsCheck = require('../utils/permissionscheck'); // Import permissions check

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
  name: 'unlink',
  description: 'Removes a player\'s Steam64 ID from their Discord account (Role-based or Admin access).',
  adminOnly: true, // Set to true since this is an admin-only command
  async execute(message, args) {
    // Check permissions (admin role or ADMINISTRATOR)
    const canExecute = permissionsCheck.canExecuteCommand(message, null, true); // true for admin-only commands

    if (!canExecute) {
      const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You do not have permission to use this command.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    if (args.length !== 1) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid Command')
        .setDescription('Please provide the user to unlink.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid User')
        .setDescription('Please mention a valid user to unlink.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const userId = targetUser.id;

    // Load existing links
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    // Unlink the Steam64 ID from the Discord user ID
    if (links[userId]) {
      delete links[userId];
      fs.writeFileSync(linksFilePath, JSON.stringify(links, null, 2));

      logger.info(`Unlinked Steam64 ID from Discord user ${userId}`);
      const embed = new EmbedBuilder()
        .setTitle('Steam64 ID Unlinked')
        .setDescription(`The Steam64 ID has been unlinked from the Discord account ${targetUser.tag}.`)
        .setColor('#0099ff');
      return message.channel.send({ embeds: [embed] });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('Steam64 ID Not Found')
        .setDescription(`No Steam64 ID found for the Discord account ${targetUser.tag}.`)
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }
  },
};
