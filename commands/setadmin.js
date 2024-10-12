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
  name: 'setadmin',
  description: 'Assigns a role as an admin role for bot commands (Admin only).',
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
        .setDescription('Please provide a valid role ID.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    // Extract numeric role ID from mention if provided
    const roleId = args[0].replace(/<@&(\d+)>/, '$1');

    // Validate role ID
    if (!/^\d+$/.test(roleId)) {
      return message.channel.send('Invalid role ID format. Please provide a numeric role ID.');
    }

    if (!settings.adminRoles) {
      settings.adminRoles = [];
    }

    settings.adminRoles.push(roleId);
    fs.writeFileSync(path.join(__dirname, '..', 'settings.json'), JSON.stringify(settings, null, 2));

    logger.info(`Role ${roleId} set as admin by ${message.author.tag}`);
    const embed = new EmbedBuilder()
      .setTitle('Admin Role Updated')
      .setDescription(`Role <@&${roleId}> has been set as an admin role.`)
      .setColor('#0099ff');
    message.channel.send({ embeds: [embed] });
  },
};
