// loadskin.js

const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');

module.exports = {
  name: 'loadskin',
  description: 'Load a saved skin configuration to your current in-game dinosaur.',
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

    // Read user data to get saved skin
    const userData = await readUserData(userId);
    if (!userData || !userData.savedSkin) {
      return message.channel.send('No saved skin found. Please save a skin using the !saveskin command first.');
    }

    const savedSkin = userData.savedSkin;

    // Read in-game dinosaur data
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
    let gameData = {};
    if (fs.existsSync(gameDataPath)) {
      gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
    } else {
      return message.channel.send('Game data not found. Please contact an administrator.');
    }

    // Apply saved skin to in-game data
    gameData.SkinPaletteSection1 = savedSkin.SkinPaletteSection1;
    gameData.SkinPaletteSection2 = savedSkin.SkinPaletteSection2;
    gameData.SkinPaletteSection3 = savedSkin.SkinPaletteSection3;
    gameData.SkinPaletteSection4 = savedSkin.SkinPaletteSection4;
    gameData.SkinPaletteSection5 = savedSkin.SkinPaletteSection5;
    gameData.SkinPaletteSection6 = savedSkin.SkinPaletteSection6;
    gameData.SkinPaletteVariation = savedSkin.SkinPaletteVariation;

    fs.writeFileSync(gameDataPath, JSON.stringify(gameData, null, 2));

    const embed = new EmbedBuilder()
      .setTitle('Skin Loaded')
      .setDescription('Your saved skin has been applied to your current in-game dinosaur.')
      .setColor('#00ff00');

    message.channel.send({ embeds: [embed] });
  },
};
