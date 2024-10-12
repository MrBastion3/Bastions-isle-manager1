const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
  name: 'events',
  description: 'Lists all the current server events with details.',
  async execute(message, args, settings) {
    const eventsFilePath = path.join(__dirname, '../events.json');
    let eventsData;

    try {
      eventsData = JSON.parse(fs.readFileSync(eventsFilePath, 'utf8')).events;
    } catch (error) {
      return message.channel.send('❌ Failed to load events.');
    }

    const currencyEmoji = settings.currencyEmoji || '💰'; // Fallback to a default emoji if not found in settings

    // Replace "Ribs" with the currency emoji in all event rewards
    eventsData.forEach(event => {
      event.rewards = event.rewards.map(reward => reward.replace(/Ribs/g, currencyEmoji));
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_event')
      .setPlaceholder('Select an event')
      .addOptions(eventsData.map(event => ({
        label: event.name,
        description: event.title,
        value: event.name
      })));

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const sentMessage = await message.channel.send({
      content: 'Select an event to view details:',
      components: [row]
    });

    const filter = interaction => interaction.customId === 'select_event' && interaction.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedEvent = eventsData.find(event => event.name === interaction.values[0]);

      const embed = new EmbedBuilder()
        .setTitle(`📅 ${selectedEvent.name}`)
        .setDescription(selectedEvent.description)
        .addFields(
          { name: '🏆 Rewards', value: selectedEvent.rewards.join('\n') },
          { name: '🎖️ Title', value: selectedEvent.title }
        )
        .setColor('#0099ff');

      await interaction.update({ embeds: [embed], components: [] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: 'No event was selected.', components: [] });
      }
    });
  },
};
