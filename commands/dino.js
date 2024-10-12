const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');
const { isCooldown, setCooldown, getCooldownTimeLeft } = require('../utils/cooldown');
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
  name: 'dino',
  description: 'Displays the player\'s current in-game dinosaur and any stored dinosaurs. Can also swap dinosaurs between game and storage.',
  async execute(message, args, settings) {
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

    // Path for game server data for current dinosaur
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);

    // Load bot data for stored dinosaurs
    let botData = await readUserData(userId);

    // Log the entire user data for debugging
    console.log(`User data for ${userId}:`, JSON.stringify(botData, null, 2));

    if (!botData) {
      // Initialize if no data exists
      botData = { dinos: {}, metadata: { points: 0, cooldowns: {} } };
    } else {
      // Ensure metadata and dinos objects are initialized
      botData.metadata = botData.metadata || {};
      botData.metadata.points = botData.metadata.points || 0; // Ensure points exist
      botData.metadata.cooldowns = botData.metadata.cooldowns || {}; // Ensure cooldowns exist
      botData.dinos = botData.dinos || {}; // Ensure dinos exist
    }

    // Log the points value for debugging
    console.log(`Points for user ${userId}:`, botData.metadata.points);

    // Check if the player's dinosaur data file exists (this determines if they can swap)
    const canSwap = fs.existsSync(gameDataPath);

    if (args.length === 1 && !isNaN(args[0])) {
      const slotNumber = parseInt(args[0], 10);

      if (!canSwap) {
        const deadEmbed = new EmbedBuilder()
          .setTitle('☠️ Dinosaur Dead')
          .setDescription('You cannot swap dinosaurs because your in-game dinosaur is dead. Please create a new dinosaur in-game before attempting to swap.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [deadEmbed], ephemeral: true });
      }

      if (isNaN(slotNumber) || slotNumber < 1 || slotNumber > settings.slots) {
        const embed = new EmbedBuilder()
          .setTitle('❌ Invalid Slot Number')
          .setDescription('Please provide a valid slot number.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed], ephemeral: true });
      }

      // Check if the dinosaur exists in the specified slot before accessing it
      if (!botData.dinos[`StoredDino${slotNumber}`]) {
        const embed = new EmbedBuilder()
          .setTitle('❌ No Dinosaur in Slot')
          .setDescription('There is no dinosaur in the specified slot to swap with.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed], ephemeral: true });
      }

      const cooldownTime = 1800; // Cooldown time set to 30 minutes (1800 seconds)
      if (await isCooldown(userId, 'dinoSwap')) {
        const timeLeft = await getCooldownTimeLeft(userId, 'dinoSwap');
        const hours = Math.floor(timeLeft / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        const embed = new EmbedBuilder()
          .setTitle('⏳ Cooldown Active')
          .setDescription(`You need to wait ${hours} hours and ${minutes} minutes before swapping dinosaurs again.`)
          .setColor('#ffcc00');
        return message.channel.send({ embeds: [embed], ephemeral: true });
      }

      // Check if the player is safe-logged (not currently logged into the server)
      const isLoggedIn = await steamUtils.isPlayerLoggedIn(steam64Id);
      if (isLoggedIn) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('🛑 Safe-Log Required')
          .setDescription('Please safe-log before swapping dinosaurs.')
          .setColor('#ffcc00');
        return message.channel.send({ embeds: [errorEmbed], ephemeral: true });
      }

      // Load player data from the game save (for current dinosaur)
      let playerData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
      logger.info(`Loaded game data for Steam64 ID: ${steam64Id}`);

      const currentDino = {
        CharacterClass: playerData.CharacterClass,
        bGender: playerData.bGender,
        Growth: playerData.Growth,
        Hunger: playerData.Hunger,
        Thirst: playerData.Thirst,
        Health: playerData.Health,
        Stamina: playerData.Stamina,
        BleedingRate: playerData.BleedingRate,
        Oxygen: playerData.Oxygen,
        ProgressionPoints: playerData.ProgressionPoints,
        ProgressionTier: playerData.ProgressionTier,
        bIsResting: false, // Ensure resting is always set to false
        "//DiscordBotInjected": "true" // Marker to indicate bot-injected data
      };

      // Ensure "//DiscordBotInjected": "true" is present in the stored dinosaur data
      if (!botData.dinos[`StoredDino${slotNumber}`]) {
        botData.dinos[`StoredDino${slotNumber}`] = {};
      }
      botData.dinos[`StoredDino${slotNumber}`]["//DiscordBotInjected"] = "true";

      playerData = { ...playerData, ...botData.dinos[`StoredDino${slotNumber}`] };
      botData.dinos[`StoredDino${slotNumber}`] = currentDino;

      fs.writeFileSync(gameDataPath, JSON.stringify(playerData, null, 2));
      await writeUserData(userId, botData);

      await setCooldown(userId, 'dinoSwap', cooldownTime);

      const embedSwap = new EmbedBuilder()
        .setTitle('🦖 Dinosaur Swapped')
        .setDescription(`Your in-game dinosaur has been swapped with the dinosaur in slot ${slotNumber}.`)
        .setColor('#00ff00');
      return message.channel.send({ embeds: [embedSwap], ephemeral: true });
    } 

    // If no slot number, show the storage and current dino info
    else {
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.username}'s Dino Storage`)
        .setColor('#0099ff');

      // Add the user's points to the embed (ensure points are always shown)
      embed.addFields({ name: 'Points', value: `${settings.currencyEmoji} ${botData.metadata.points.toString()}`, inline: false });

      // Function to format cooldowns
      const formatCooldown = (timestamp, cooldownName) => {
        if (!timestamp || timestamp <= Date.now()) {
          logger.info(`No cooldown set for ${cooldownName}`);
          return 'None';
        }
        const msLeft = timestamp - Date.now();
        const hours = Math.floor(msLeft / 3600000);
        const minutes = Math.floor((msLeft % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
      };

      embed.addFields(
        { name: 'Work Cooldown', value: formatCooldown(botData.metadata.cooldowns?.work, 'work'), inline: true },
        { name: 'Teleport Cooldown', value: formatCooldown(botData.metadata.cooldowns?.teleport, 'teleport'), inline: true },
        { name: 'Swap Cooldown', value: formatCooldown(botData.metadata.cooldowns?.dinoSwap, 'dinoSwap'), inline: true },
        { name: 'Travel Cooldown', value: formatCooldown(botData.metadata.cooldowns?.travel, 'travel'), inline: true }
      );

      // Show current in-game dino if it exists
      if (canSwap) {
        const playerData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
        if (playerData.CharacterClass && playerData.CharacterClass !== 'None') {
          const currentDino = playerData.CharacterClass;
          const currentDinoGender = playerData.bGender ? ':female_sign:' : ':male_sign:';
          embed.addFields({
            name: 'Current Dino:',
            value: `${currentDinoGender} ${currentDino}`,
            inline: false
          });
        } else {
          embed.addFields({
            name: 'Current Dino:',
            value: ':skull: No dinosaur',
            inline: false
          });
        }
      } else {
        embed.addFields({
          name: 'Current Dino:',
          value: ':skull: No dinosaur (In-game dino data not found)',
          inline: false
        });
      }

      // Display stored dinosaurs or show "No dinosaurs stored"
      let hasStoredDinos = false;
      for (let i = 1; i <= settings.slots; i++) {
        const dinoKey = `StoredDino${i}`;
        if (botData.dinos[dinoKey]) {
          const storedDino = botData.dinos[dinoKey];
          const storedDinoGender = storedDino.bGender ? ':female_sign:' : ':male_sign:';
          embed.addFields({
            name: `Slot ${i}:`,
            value: `${storedDinoGender} ${storedDino.CharacterClass} Growth [${storedDino.Growth}]`,
            inline: false
          });
          hasStoredDinos = true;
        }
      }

      // If no stored dinos, show a message
      if (!hasStoredDinos) {
        embed.addFields({
          name: 'Stored Dinosaurs',
          value: 'You have no dinosaurs stored.',
          inline: false
        });
      }

      message.channel.send({ embeds: [embed], ephemeral: true });
    }
  },
};
