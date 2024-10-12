const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
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
  name: 'setcooldown',
  description: 'Sets the cooldown period for any command (Admin only).',
  adminOnly: true,
  async execute(message, args, settings) {
    try {
      // Check if the user has one of the admin roles
      const isAdmin = message.member.roles.cache.some(role => settings.adminRoles.includes(role.id));
      if (!isAdmin) {
        const embed = new EmbedBuilder()
          .setTitle('Permission Denied')
          .setDescription('You do not have permission to use this command.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      // List of commands that can have their cooldowns modified
      const commandNames = message.client.commands.map(cmd => cmd.name);

      // Split commands into groups of 25 or less to fit within the select menu limit
      const commandGroups = [];
      for (let i = 0; i < commandNames.length; i += 25) {
        commandGroups.push(commandNames.slice(i, i + 25));
      }

      const rows = commandGroups.map((group, index) => {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_command_${index}`)
          .setPlaceholder('Select a command to set cooldown')
          .addOptions(
            group.map(commandName => ({
              label: commandName,
              value: commandName
            }))
          );

        return new ActionRowBuilder().addComponents(selectMenu);
      });

      const embed = new EmbedBuilder()
        .setTitle('Set Cooldown')
        .setDescription('Select the command you want to set a cooldown for:')
        .setColor('#0099ff');

      const sentMessage = await message.channel.send({ embeds: [embed], components: rows });

      // Collector to handle the menu selection
      const filter = interaction => interaction.customId.startsWith('select_command') && interaction.user.id === message.author.id;
      const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

      collector.on('collect', async interaction => {
        try {
          const selectedCommand = interaction.values[0];
          await interaction.update({ content: `You selected **${selectedCommand}**. Please enter the new cooldown time in seconds:`, components: [] });

          // Wait for the admin to input the cooldown time
          const filter = response => response.author.id === message.author.id && !isNaN(response.content);
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });

          const cooldownTime = parseInt(collected.first().content, 10);
          settings.cooldowns[selectedCommand] = cooldownTime;
          fs.writeFileSync(path.join(__dirname, '..', 'settings.json'), JSON.stringify(settings, null, 2));

          logger.info(`Cooldown for ${selectedCommand} set to ${cooldownTime} seconds by ${message.author.tag}`);
          await collected.first().reply(`The cooldown for the **${selectedCommand}** command has been set to ${cooldownTime} seconds.`);
        } catch (error) {
          logger.error(`Error during cooldown setup: ${error.message}`);
          await interaction.followUp('An error occurred while setting the cooldown. Please try again.');
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          sentMessage.edit({ content: 'No command was selected.', components: [] }).catch(error => logger.error(`Error editing message after timeout: ${error.message}`));
        }
      });

    } catch (error) {
      logger.error(`Error executing setcooldown command: ${error.message}`);
      message.channel.send('An unexpected error occurred while trying to set the cooldown. Please try again later.');
    }
  },
};
