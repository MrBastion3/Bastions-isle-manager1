const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');

module.exports = {
  name: 'trash',
  description: 'Trashes a dinosaur from the user\'s storage or current in-game dinosaur.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    // Load linked Steam64 IDs
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    const steam64Id = links[userId];
    if (!steam64Id) {
      return message.channel.send('Steam64 ID not linked. Please use the !link command to link your account.');
    }

    // Read in-game dinosaur data (assuming game server data is accessible)
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
    let gameData = {};
    if (fs.existsSync(gameDataPath)) {
      gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
    }

    // Read stored dinosaur data
    const userData = await readUserData(userId);
    if (!userData) {
      return message.channel.send('No data found for this user.');
    }

    // Create options for the dropdown menu
    const dinoOptions = [];

    // Add current in-game dinosaur to options if exists
    if (gameData.CharacterClass && gameData.CharacterClass !== 'None') {
      dinoOptions.push({
        label: `Current Dino: ${gameData.CharacterClass}`,
        description: 'In-game',
        value: 'current'
      });
    }

    // Add stored dinosaurs to options
    if (userData.dinos) {
      for (let i = 1; i <= settings.slots; i++) {
        const key = `StoredDino${i}`;
        if (userData.dinos[key]) {
          const dino = userData.dinos[key];
          dinoOptions.push({
            label: `Stored Dino ${i}: ${dino.CharacterClass}`,
            description: `Growth [${dino.Growth}] Thirst [${dino.Thirst}]`,
            value: key
          });
        }
      }
    }

    if (dinoOptions.length === 0) {
      return message.channel.send('No dinosaurs found to trash.');
    }

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_dino_trash')
        .setPlaceholder('Select a dinosaur to trash...')
        .addOptions(dinoOptions)
    );

    const sentMessage = await message.channel.send({ content: 'Select a dinosaur to trash:', components: [row] });

    const filter = interaction => interaction.customId === 'select_dino_trash' && interaction.user.id === userId;
    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedDino = interaction.values[0];

      if (selectedDino === 'current') {
        if (gameData.CharacterClass && gameData.CharacterClass !== 'None') {
          // Trashing the current in-game dinosaur (effectively sets it to None)
          gameData = {};
          fs.writeFileSync(gameDataPath, JSON.stringify(gameData, null, 2));

          const embed = new EmbedBuilder()
            .setTitle('Dinosaur Trashed')
            .setDescription('Your current in-game dinosaur has been removed.')
            .setColor('#ff0000');

          await interaction.update({ content: 'Current dinosaur trashed successfully.', embeds: [embed], components: [] });
        } else {
          await interaction.update({ content: 'Error: No current dinosaur found.', components: [] });
        }
      } else if (userData.dinos && userData.dinos[selectedDino]) {
        // Trashing a stored dinosaur
        delete userData.dinos[selectedDino];
        await writeUserData(userId, userData);

        const embed = new EmbedBuilder()
          .setTitle('Dinosaur Trashed')
          .setDescription(`Dinosaur from slot ${selectedDino.replace('StoredDino', '')} has been removed from your storage.`)
          .setColor('#ff0000');

        await interaction.update({ content: 'Stored dinosaur trashed successfully.', embeds: [embed], components: [] });
      } else {
        await interaction.update({ content: 'Error: Dinosaur not found.', components: [] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: 'No dinosaur was selected.', components: [] });
      }
    });
  },
};
