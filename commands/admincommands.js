const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'adminhelp',
  description: 'Displays all admin-only commands and their descriptions.',
  adminOnly: true,  // Ensures this command is marked as admin only
  async execute(message, args, settings) {
    // Check if the user has one of the admin roles or has the "Administrator" permission
    if (
      !message.member.roles.cache.some(role => settings.adminRoles.includes(role.id)) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      const embed = new EmbedBuilder()
        .setTitle('Permission Denied')
        .setDescription('You do not have permission to use this command.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed], ephemeral: true }); // Makes the embed visible only to the user
    }

    // List of command names to exclude from the help command (for non-administrators)
    const excludedCommands = [
      'setworkrange', 'setteleportcost', 'setslots', 
      'setlogchannel', 'setemoji', 'setcooldown', 
      'setchannel', 'setadmin', 'resetcooldowns', 
      'info', 'adminhelp'
    ];

    // Determine if the user has the "Administrator" permission
    const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Filter the commands: show all if the user is an administrator, otherwise exclude specific commands
    const adminCommands = message.client.commands.filter(cmd => cmd.adminOnly && (isAdmin || !excludedCommands.includes(cmd.name)));

    if (!adminCommands.size) {
      const embed = new EmbedBuilder()
        .setTitle('Admin Commands')
        .setDescription('No admin-only commands found.')
        .setColor('#0099ff');
      return message.channel.send({ embeds: [embed], ephemeral: true }); // Makes the embed visible only to the user
    }

    const embed = new EmbedBuilder()
      .setTitle('Admin Commands')
      .setDescription('Here is a list of admin-only commands and their descriptions.')
      .setColor('#0099ff');

    adminCommands.forEach(command => {
      embed.addFields(
        { name: `!${command.name}`, value: `${command.description}`, inline: false }
      );
    });

    message.channel.send({ embeds: [embed], ephemeral: true }); // Sends the embed visible only to the user
  },
};
