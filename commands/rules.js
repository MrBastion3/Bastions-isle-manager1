const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ],
});

const itemsPerPage = 5; // Number of rules per page
const userPages = new Map(); // Store user's current page and category

module.exports = {
  name: 'rules',
  description: 'Displays the server rules with navigation.',
  async execute(message, args) {
    logger.debug('Rules command executed.');

    // Load rules from JSON file
    const rulesFilePath = path.join(__dirname, '..', 'rules.json');
    let rules;

    try {
      rules = JSON.parse(fs.readFileSync(rulesFilePath, 'utf8'));
      logger.debug('Rules loaded successfully.');
    } catch (error) {
      logger.error(`Failed to load rules: ${error.message}`);
      return message.channel.send('❌ Failed to load the rules.');
    }

    // Default to first page if no page specified
    const category = args[0] || Object.keys(rules)[0];
    const page = 0;

    if (!rules[category]) {
      logger.debug(`Invalid category provided: ${category}`);
      return message.channel.send(`Invalid category. Available categories: ${Object.keys(rules).join(', ')}`);
    }

    // Save user's current page and category
    userPages.set(message.author.id, { page, category });

    // Send dropdown menu
    const categories = Object.keys(rules);
    logger.debug(`Categories found: ${categories.join(', ')}`);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_category')
      .setPlaceholder('Select a category')
      .addOptions(
        categories.map(category => ({
          label: category,
          value: category,
        }))
      );

    const selectRow = new ActionRowBuilder().addComponents(selectMenu);

    const rulesPage = rules[category].slice(page * itemsPerPage, (page + 1) * itemsPerPage);
    const totalPages = Math.ceil(rules[category].length / itemsPerPage);

    const embed = new EmbedBuilder()
      .setTitle(`${category} - Page ${page + 1}/${totalPages}`)
      .setDescription(rulesPage.join('\n\n'))
      .setColor('#0099ff')
      .setFooter({ text: `Page ${page + 1} of ${totalPages}` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('prev_page')
          .setLabel('Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId('next_page')
          .setLabel('Next')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );

    const messageOptions = { embeds: [embed], components: [selectRow, row], ephemeral: true };

    const sentMessage = await message.channel.send(messageOptions);

    const filter = interaction => {
      return interaction.user.id === message.author.id && ['prev_page', 'next_page', 'select_category'].includes(interaction.customId);
    };

    const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'select_category') {
        // Category change via dropdown
        const selectedCategory = interaction.values[0];
        userPages.set(interaction.user.id, { page: 0, category: selectedCategory });
      } else {
        // Page navigation
        const { page, category } = userPages.get(interaction.user.id);
        if (interaction.customId === 'next_page') {
          userPages.set(interaction.user.id, { page: page + 1, category });
        } else if (interaction.customId === 'prev_page') {
          userPages.set(interaction.user.id, { page: page - 1, category });
        }
      }

      const { page, category } = userPages.get(interaction.user.id);
      const newRulesPage = rules[category].slice(page * itemsPerPage, (page + 1) * itemsPerPage);
      const newTotalPages = Math.ceil(rules[category].length / itemsPerPage);

      const newEmbed = new EmbedBuilder()
        .setTitle(`${category} - Page ${page + 1}/${newTotalPages}`)
        .setDescription(newRulesPage.join('\n\n'))
        .setColor('#0099ff')
        .setFooter({ text: `Page ${page + 1} of ${newTotalPages}` });

      const newRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page === newTotalPages - 1)
        );

      await interaction.update({ embeds: [newEmbed], components: [selectRow, newRow], ephemeral: true });
    });

    collector.on('end', async collected => {
      if (!collected.size) {
        message.channel.send('⏰ Time’s up! Navigation ended.', { ephemeral: true });
      }
      // Delete the original message after the timeout
      await sentMessage.delete().catch(error => logger.error(`Failed to delete the message: ${error.message}`));
    });
  },
};
