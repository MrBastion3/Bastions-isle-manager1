// saveskin.js

const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');

module.exports = {
  name: 'saveskin',
  description: 'Save the current in-game dinosaur skin configuration.',
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

    // Read in-game dinosaur data
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
    let gameData = {};
    if (fs.existsSync(gameDataPath)) {
      gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
    } else {
      return message.channel.send('Game data not found. Please contact an administrator.');
    }

    // Extract skin data
    const skinData = {
      SkinPaletteSection1: gameData.SkinPaletteSection1,
      SkinPaletteSection2: gameData.SkinPaletteSection2,
      SkinPaletteSection3: gameData.SkinPaletteSection3,
      SkinPaletteSection4: gameData.SkinPaletteSection4,
      SkinPaletteSection5: gameData.SkinPaletteSection5,
      SkinPaletteSection6: gameData.SkinPaletteSection6,
      SkinPaletteVariation: gameData.SkinPaletteVariation,
    };

    // Read and update user data
    let userData = await readUserData(userId);
    if (!userData) {
      userData = {};
    }

    userData.savedSkin = skinData;
    await writeUserData(userId, userData);

    const embed = new EmbedBuilder()
      .setTitle('Skin Saved')
      .setDescription('Your current in-game dinosaur skin has been saved.')
      .setColor('#00ff00');

    message.channel.send({ embeds: [embed] });
  },
};
