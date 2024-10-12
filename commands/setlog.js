const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const settingsPath = path.join(__dirname, '..', 'settings.json');

module.exports = {
  name: 'setlogchannel',
  description: 'Sets the log channel for the bot.',
  adminOnly: true,
  async execute(message, args, settings) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('You do not have permission to use this command.');
    }

    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply('Please mention a valid channel.');
    }

    settings.logChannelId = channel.id;

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    logger.logToDiscord('info', `Log channel set to: ${channel.name}`);

    const embed = new EmbedBuilder()
      .setTitle('Log Channel Set')
      .setDescription(`Log channel has been set to ${channel}`)
      .setColor('#00ff00');

    message.channel.send({ embeds: [embed] });
  },
};
