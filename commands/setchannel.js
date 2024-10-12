const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'setchannel',
  description: 'Admin command to set which commands can be used in a specific channel.',
  adminOnly: true,
  async execute(message) {
    const channelID = message.channel.id; // Use the current channel's ID
    const configPath = path.join(__dirname, '../channelPermissions.json');
    let channelPermissions;

    try {
      channelPermissions = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      channelPermissions = {};
    }

    // Fetch all commands, including admin-only commands
    const allCommands = message.client.commands;

    // Add "All Commands" option
    const allCommandsOption = {
      label: 'All Commands',
      description: 'Allow all commands to be used in this channel.',
      value: 'all_commands'
    };

    // Map commands to dropdown options
    const commandOptions = [
      allCommandsOption,
      ...allCommands.map(command => ({
        label: command.name,
        description: command.description ? command.description.substring(0, 100) : 'No description provided.',
        value: command.name
      }))
    ];

    // Split commands into multiple select menus if they exceed 25
    const rows = [];
    while (commandOptions.length > 0) {
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_command_${rows.length}`)
          .setPlaceholder('Choose a command...')
          .addOptions(commandOptions.splice(0, 25))
      );
      rows.push(row);
    }

    const sentMessage = await message.channel.send({ content: 'Select a command to allow in this channel:', components: rows });

    const filter = interaction => interaction.customId.startsWith('select_command') && interaction.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedCommand = interaction.values[0];

      if (!channelPermissions[channelID]) {
        channelPermissions[channelID] = [];
      }

      if (selectedCommand === 'all_commands') {
        channelPermissions[channelID] = allCommands.map(command => command.name);
        fs.writeFileSync(configPath, JSON.stringify(channelPermissions, null, 2), 'utf8');
        interaction.reply(`All commands are now allowed in channel <#${channelID}>.`);
      } else {
        if (!channelPermissions[channelID].includes(selectedCommand)) {
          channelPermissions[channelID].push(selectedCommand);
          fs.writeFileSync(configPath, JSON.stringify(channelPermissions, null, 2), 'utf8');
          interaction.reply(`Command \`${selectedCommand}\` is now allowed in channel <#${channelID}>.`);
        } else {
          interaction.reply(`Command \`${selectedCommand}\` is already allowed in channel <#${channelID}>.`);
        }
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: 'No command was selected.', components: [] });
      }
    });
  },
};
