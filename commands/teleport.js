const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');
const { setCooldown, isCooldown, getCooldownTimeLeft } = require('../utils/cooldown');
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

// Dinosaur categories and their corresponding class names
const juveniles = [
  'AnkyJuv', 'AustroJuv', 'AvaJuv', 'PuertaJuv', 'ShantJuv', 'StegoJuv', 'TheriJuv',
  'RexJuv', 'RexJuvS', 'SpinoJuv', 'SpinoJuvS', 'GigaJuv', 'GigaJuvS', 'DiabloJuvS',
  'DryoJuvS', 'GalliJuvS', 'MaiaJuvS', 'PachyJuvS', 'ParaJuvS', 'TrikeJuvS', 'AlloJuv',
  'AlloJuvS', 'AcroJuv', 'BaryJuv', 'CarnoJuv', 'CarnoJuvS', 'CeratoJuv', 'CeratoJuvS',
  'DiloJuv', 'DiloJuvS', 'HerreraJuv', 'UtahJuv', 'UtahJuvS', 'SuchoJuv', 'SuchoJuvS'
];

const midTier = [
  'Acro', 'Alberto', 'DiloAdultS', 'AlloAdultS', 'UtahAdultS', 'SuchoAdultS', 'CeratoAdultS',
  'Austro', 'BaryAdultS', 'CarnoAdultS', 'Herrera', 'MaiaAdultS', 'DiabloAdultS', 'Anky', 
  'GalliAdultS', 'DryoAdultS', 'PachyAdultS', 'ParaAdultS', 'StegoAdultS', 'TheriAdultS'
];

const apex = [
  'RexAdultS', 'Spino', 'GigaAdultS', 'Shant', 'TrikeAdultS', 'Camara'
];

// Function to determine the price based on the dinosaur class
function getDinoPrice(characterClass) {
  if (juveniles.includes(characterClass)) {
    return 10000; // Juvenile cost
  } else if (midTier.includes(characterClass)) {
    return 15000; // Mid-Tier cost
  } else if (apex.includes(characterClass)) {
    return 20000; // Apex cost
  } else {
    return null; // Unknown dinosaur type
  }
}

module.exports = {
  name: 'teleport',
  description: 'Teleports a dinosaur to another player\'s location.',
  aliases: ['tp'], // Allow both !teleport and !tp
  async execute(message, args, settings) {

    if (args.length < 1) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Invalid Command Usage')
        .setDescription('Please mention a player to teleport to. Format: `!teleport @player`')
        .setColor('#ff0000')
        .setFooter({ text: "Make sure to tag a valid user!" });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Invalid User Mention')
        .setDescription('Please mention a valid user to teleport to.')
        .setColor('#ff0000')
        .setFooter({ text: "Try tagging someone who is in the channel." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const targetUserId = targetUser.id;
    const userId = message.author.id;

    if (userId === targetUserId) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('⚠️ Cannot Teleport to Yourself')
        .setDescription('You cannot teleport to yourself. Please choose another user.')
        .setColor('#ffcc00')
        .setFooter({ text: "Select a different target." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    const steam64Id = links[userId];
    const targetSteam64Id = links[targetUserId];

    if (!steam64Id) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🔗 Steam64 ID Not Linked')
        .setDescription('Your Steam64 ID is not linked. Please use the `!link` command to link your account.')
        .setColor('#ff0000')
        .setFooter({ text: "Link your Steam64 ID to use this command." });
      return message.channel.send({ embeds: [errorEmbed] });
    }
    if (!targetSteam64Id) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🔗 Target User\'s Steam64 ID Not Linked')
        .setDescription('The target player\'s Steam64 ID is not linked. They must link their ID to use this command.')
        .setColor('#ff0000')
        .setFooter({ text: "Ask the user to link their Steam64 ID." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Ensure the user (person initiating the teleport) is SafeLogged before teleport
    const isUserLoggedIn = await steamUtils.isPlayerLoggedIn(steam64Id);
    if (isUserLoggedIn) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🛑 You must SafeLog first')
        .setDescription('You must SafeLog before initiating a teleport.')
        .setColor('#ffcc00')
        .setFooter({ text: "SafeLog and try again." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Load game data files
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
    const targetGameDataPath = path.join(settings.dataPath, `${targetSteam64Id}.json`);

    if (!fs.existsSync(gameDataPath)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('📂 Game Data Not Found')
        .setDescription('Your game data could not be found.')
        .setColor('#ff0000')
        .setFooter({ text: "Check if your game data is saved correctly." });
      return message.channel.send({ embeds: [errorEmbed] });
    }
    if (!fs.existsSync(targetGameDataPath)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('📂 Target Player\'s Game Data Not Found')
        .setDescription('The target player\'s game data could not be found.')
        .setColor('#ff0000')
        .setFooter({ text: "Ensure the target player's data exists." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
    const targetGameData = JSON.parse(fs.readFileSync(targetGameDataPath, 'utf8'));

    // Determine the user's current dinosaur and the cost
    const currentDino = gameData.CharacterClass;
    const teleportCost = getDinoPrice(currentDino);

    if (!teleportCost) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Invalid Dinosaur Type')
        .setDescription(`Your current dinosaur type (${currentDino}) is not supported for teleport.`)
        .setColor('#ff0000');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Check if user has enough points
    let userData;
    try {
      userData = await readUserData(userId);
    } catch (error) {
      logger.error(`Error reading user data for Discord ID ${userId}: ${error.message}`);
      const errorEmbed = new EmbedBuilder()
        .setTitle('⚠️ Error Accessing Data')
        .setDescription('There was an error accessing your data. Please try again later.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [errorEmbed] });
    }

    if (!userData.metadata.points || userData.metadata.points < teleportCost) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('💰 Insufficient Points')
        .setDescription(`You need at least ${settings.currencyEmoji} ${teleportCost} to teleport.`)
        .setColor('#ff0000')
        .setFooter({ text: "Earn more points before attempting to teleport." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Create confirmation buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_teleport')
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId('deny_teleport')
        .setLabel('Deny')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌')
    );

    const requestEmbed = new EmbedBuilder()
      .setTitle('🚀 Teleport Request')
      .setDescription(`${message.author.username} wants to teleport to your location. Do you accept?`)
      .setColor('#0099ff');

    try {
      const sentMessage = await targetUser.send({ embeds: [requestEmbed], components: [row] });

      const filter = (interaction) => ['accept_teleport', 'deny_teleport'].includes(interaction.customId) && interaction.user.id === targetUserId;
      const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000, max: 1 });

      // Notify the channel about the teleport request
      const waitingMessage = await message.channel.send(`Waiting for ${targetUser.username} to respond to the teleport request...`);

      collector.on('collect', async (interaction) => {
        if (interaction.customId === 'accept_teleport') {
          // Deduct points and update location
          userData.metadata.points -= teleportCost;
          gameData.Location_Isle_V3 = targetGameData.Location_Isle_V3;
          fs.writeFileSync(gameDataPath, JSON.stringify(gameData, null, 2));
          await writeUserData(userId, userData);

          // Set the teleport cooldown
          const cooldownTime = settings.cooldowns.teleport || 3600; // Cooldown time in seconds, default to 1 hour
          await setCooldown(userId, 'teleport', cooldownTime);
          logger.info(`Cooldown for teleport set for user ${userId}.`);

          await interaction.update({ content: 'Teleport request accepted.', components: [], embeds: [] });

          const confirmationEmbed = new EmbedBuilder()
            .setTitle('✅ Teleportation Complete')
            .setDescription(`You have been teleported to ${targetUser.username}'s location. ${settings.currencyEmoji} ${teleportCost} has been deducted from your balance.`)
            .setColor('#00ff00');
          await message.channel.send({ embeds: [confirmationEmbed] });

        } else {
          await interaction.update({ content: 'Teleport request denied.', components: [], embeds: [] });
          const deniedEmbed = new EmbedBuilder()
            .setTitle('❌ Teleport Request Denied')
            .setDescription(`${targetUser.username} has denied your teleport request.`)
            .setColor('#ff0000');
          await message.channel.send({ embeds: [deniedEmbed] });
        }

        // Delete the waiting message
        waitingMessage.delete();
      });

      collector.on('end', async collected => {
        if (collected.size === 0) {
          await sentMessage.edit({ content: 'No response to the teleport request.', components: [], embeds: [] });
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⌛ Teleport Request Timed Out')
            .setDescription('Teleport request timed out with no response.')
            .setColor('#ffcc00');
          await message.channel.send({ embeds: [timeoutEmbed] });

          // Delete the waiting message
          waitingMessage.delete();
        }
      });

    } catch (error) {
      logger.error(`Error sending DM to ${targetUser.tag}: ${error}`);
      const errorEmbed = new EmbedBuilder()
        .setTitle('⚠️ Failed to Send Teleport Request')
        .setDescription('Failed to send a teleport request. The target user may have DMs disabled.')
        .setColor('#ff0000');
      message.channel.send({ embeds: [errorEmbed] });
    }
  },
};
