const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'stats',
  description: 'Displays stats for selected dinosaurs.',
  async execute(message, args, settings) {
    const dataPath = path.join(__dirname, '..', 'data', 'dinoStats.json');
    let dinoStats;

    try {
      dinoStats = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    } catch (error) {
      console.error('Error reading dino stats data:', error);
      return message.channel.send('Could not load dinosaur stats data.');
    }

    const herbivores = Object.keys(dinoStats).filter(dino => dinoStats[dino].Diet === '🌿');
    const carnivores = Object.keys(dinoStats).filter(dino => dinoStats[dino].Diet === '🍖');

    if (!herbivores.length && !carnivores.length) {
      return message.channel.send('No dinosaur stats available.');
    }

    const herbivoreOptions = herbivores.map(dino => ({
      label: dino,
      value: dino
    }));

    const carnivoreOptions = carnivores.map(dino => ({
      label: dino,
      value: dino
    }));

    const herbivoreRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_herbivore')
        .setPlaceholder('Choose a herbivore...')
        .addOptions(herbivoreOptions)
    );

    const carnivoreRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_carnivore')
        .setPlaceholder('Choose a carnivore...')
        .addOptions(carnivoreOptions)
    );

    const sentMessage = await message.channel.send({
      content: 'Select a dinosaur to view its stats:',
      components: [herbivoreRow, carnivoreRow]
    });

    const filter = interaction =>
      (interaction.customId === 'select_herbivore' || interaction.customId === 'select_carnivore') &&
      interaction.user.id === message.author.id;

    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedDino = interaction.values[0];
      const stats = dinoStats[selectedDino];

      let growthTime = stats['Growth Time (min)'];
      let growthTimeFormatted;

      if (growthTime >= 60) {
        const hours = Math.floor(growthTime / 60);
        const minutes = growthTime % 60;
        growthTimeFormatted = `${hours}h ${minutes}m`;
      } else {
        growthTimeFormatted = `${growthTime}m`;
      }

      const embedColor = stats.Diet === '🌿' ? '#00ff00' : '#ff0000';

      const embed = new EmbedBuilder()
        .setTitle(`📊 ${selectedDino} Stats`)
        .addFields(
          { name: 'Diet', value: stats.Diet, inline: true },
          { name: 'Base Damage', value: stats['Base Damage'].toString(), inline: true },
          { name: 'Alternate Attack', value: stats['Alternate Attack'], inline: true },
          { name: 'Health', value: stats.Health.toString(), inline: true },
          { name: 'Mass (kg)', value: stats['Mass (kg)'].toString(), inline: true },
          { name: 'Speed (km/h)', value: stats['Speed (km/h)'].toString(), inline: true },
          { name: 'Ambush (km/h)', value: stats['Ambush (km/h)'].toString(), inline: true },
          { name: 'Sprint Duration (min)', value: stats['Sprint Duration (min)'], inline: true },
          { name: 'Base Bleed', value: stats['Base Bleed'].toString(), inline: true },
          { name: 'Growth Time', value: growthTimeFormatted, inline: true }
        )
        .setColor(embedColor);

      try {
        await interaction.update({ content: null, embeds: [embed], components: [] });
      } catch (error) {
        if (error.code === 10062 || error.code === 40060) {
          console.error('Interaction has already been acknowledged or expired.');
        } else {
          console.error('Failed to update interaction:', error);
        }
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: 'No dinosaur was selected.', components: [] });
      }
    });
  },
};
