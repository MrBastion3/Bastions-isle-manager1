const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');
const steamUtils = require('../utils/steamUtils');
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
  name: 'gender',
  description: 'Allows the user to swap the gender of their in-game or stored dinosaurs for 2500 points.',
  async execute(message, args, settings) {
    const GENDER_SWAP_COST = 2500;
    let targetUser = message.author;

    if (args.length && message.mentions.users.size) {
      targetUser = message.mentions.users.first();
    }

    const userId = targetUser.id;

    // Load linked Steam64 IDs
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    const links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));

    if (!links[userId]) {
      const embed = new EmbedBuilder()
        .setTitle('🔗 Steam64 ID Not Linked')
        .setDescription('You must link your Steam64 ID using the `!link` command before using this command.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed], ephemeral: true });
    }

    const steam64Id = links[userId];
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
    let botData = await readUserData(userId);

    if (!botData || !botData.dinos) {
      botData = { dinos: {}, metadata: { points: 0, cooldowns: {} } }; // Initialize as empty if no data exists
    }

    const canSwap = fs.existsSync(gameDataPath);

    // Check if user has enough points
    if (botData.metadata.points < GENDER_SWAP_COST) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Insufficient Points')
        .setDescription(`You need at least ${GENDER_SWAP_COST} points to swap a dinosaur's gender. You currently have ${botData.metadata.points} points.`)
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed], ephemeral: true });
    }

    // Create the dropdown menu for the user to select which dino to swap gender
    const options = [];

    // Add in-game dino if available
    if (canSwap) {
      const playerData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
      if (playerData.CharacterClass && playerData.CharacterClass !== 'None') {
        const currentGender = playerData.bGender ? 'Female' : 'Male';
        options.push({
          label: `In-Game Dino: ${currentGender} ${playerData.CharacterClass}`,
          description: `Current in-game dinosaur.`,
          value: 'currentDino'
        });
      }
    }

    // Add stored dinos to the dropdown
    for (let i = 1; i <= settings.slots; i++) {
      const dinoKey = `StoredDino${i}`;
      if (botData.dinos[dinoKey]) {
        const storedDino = botData.dinos[dinoKey];
        const storedGender = storedDino.bGender ? 'Female' : 'Male';
        options.push({
          label: `Stored Dino Slot ${i}: ${storedGender} ${storedDino.CharacterClass}`,
          description: `Stored dinosaur in slot ${i}.`,
          value: `storedDino${i}`
        });
      }
    }

    if (options.length === 0) {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Dinosaurs Available')
        .setDescription('You have no dinosaurs to change gender.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed], ephemeral: true });
    }

    // Create the dropdown component
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('genderSwapMenu')
        .setPlaceholder('Select a dinosaur to change gender')
        .addOptions(options)
    );

    const embed = new EmbedBuilder()
      .setTitle('🦖 Select a Dinosaur')
      .setDescription('Choose a dinosaur to swap its gender for 2500 points.')
      .setColor('#0099ff');

    const messageResponse = await message.channel.send({ embeds: [embed], components: [row], ephemeral: true });

    const filter = i => i.user.id === message.author.id;
    const collector = messageResponse.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedDino = interaction.values[0];
      let newGender;

      if (selectedDino === 'currentDino' && canSwap) {
        // Check if the player is currently logged in
        const isLoggedIn = await steamUtils.isPlayerLoggedIn(steam64Id);
        if (isLoggedIn) {
          // If logged in, prompt the user to safe-log before proceeding
          const errorEmbed = new EmbedBuilder()
            .setTitle('🛑 Safe-Log Required')
            .setDescription('Please safe-log before changing the gender of your in-game dinosaur.')
            .setColor('#ffcc00');
          return interaction.update({ embeds: [errorEmbed], components: [], ephemeral: true });
        }

        // Toggle gender for the in-game dinosaur
        const playerData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
        playerData.bGender = !playerData.bGender; // Swap gender
        newGender = playerData.bGender ? 'Female' : 'Male';
        fs.writeFileSync(gameDataPath, JSON.stringify(playerData, null, 2));
        logger.info(`Gender swapped for in-game dinosaur of user ${userId} (Steam64: ${steam64Id})`);
      } else {
        // Toggle gender for a stored dinosaur
        const slot = selectedDino.replace('storedDino', ''); // Extract the slot number
        const dinoKey = `StoredDino${slot}`;
        if (botData.dinos[dinoKey]) {
          botData.dinos[dinoKey].bGender = !botData.dinos[dinoKey].bGender; // Swap gender
          newGender = botData.dinos[dinoKey].bGender ? 'Female' : 'Male';
          await writeUserData(userId, botData);
          logger.info(`Gender swapped for stored dinosaur in slot ${slot} for user ${userId}`);
        }
      }

      // Deduct 2500 points
      botData.metadata.points -= GENDER_SWAP_COST;
      await writeUserData(userId, botData);

      const confirmationEmbed = new EmbedBuilder()
        .setTitle('✅ Gender Swapped')
        .setDescription(`The selected dinosaur's gender has been swapped to ${newGender}. You have been charged ${GENDER_SWAP_COST} points. Remaining points: ${botData.metadata.points}`)
        .setColor('#00ff00');

      await interaction.update({ embeds: [confirmationEmbed], components: [], ephemeral: true });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        messageResponse.edit({ content: 'Gender swap command timed out.', components: [], ephemeral: true });
      }
    });
  },
};
