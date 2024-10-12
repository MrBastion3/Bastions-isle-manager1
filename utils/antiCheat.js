const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const winston = require('winston');

// Set up logging
const logger = winston.createLogger({
  level: 'info', // Only log important actions, errors, and interactions
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ],
});

let steamUsernameCache = {}; // Define the cache object for Steam usernames

const reportedCheatersFile = path.join(__dirname, 'reportedCheaters.json');
const linksFilePath = path.join(__dirname, '..', 'links.json');
let reportedCheaters = [];
let links = {};

// Load reported cheaters from file
if (fs.existsSync(reportedCheatersFile)) {
  const data = fs.readFileSync(reportedCheatersFile, 'utf8');
  reportedCheaters = JSON.parse(data);
  logger.info('Reported cheaters loaded.');
}

// Load links.json file for Discord account associations
if (fs.existsSync(linksFilePath)) {
  const data = fs.readFileSync(linksFilePath, 'utf8');
  links = JSON.parse(data);
  logger.info('Links.json loaded.');
}

// Fetch Steam username using Steam64 ID (with caching)
async function getSteamUsername(steam64Id) {
  if (steamUsernameCache[steam64Id]) {
    return steamUsernameCache[steam64Id]; // Return cached username
  }

  try {
    const response = await axios.get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steam64Id}`);
    const player = response.data.response.players[0];
    const username = player ? player.personaname : 'Unknown';

    // Cache the username to avoid future API calls
    steamUsernameCache[steam64Id] = username;
    return username;
  } catch (error) {
    logger.error(`Error fetching Steam username for ID ${steam64Id}: ${error.message}`);
    return 'Unknown';
  }
}

// Add cheater to reportedCheaters.json with correct format
function addCheaterToReportedCheaters(steam64Id, steamUsername) {
  const existingCheater = reportedCheaters.find(c => c.steam64Id === steam64Id);

  if (!existingCheater) {
    reportedCheaters.push({ steam64Id, steamUsername });
    logger.info(`Adding cheater: ${steam64Id} (${steamUsername}) to reportedCheaters.json`);
    fs.writeFileSync(reportedCheatersFile, JSON.stringify(reportedCheaters, null, 2));
  }
}

// Create a pretty embed for potential cheaters
async function createCheaterEmbed(client, steam64Id, steamUsername, characterClass, reason, logChannel, discordUser) {
  const embed = new EmbedBuilder()
    .setTitle('🚨 **Potential Cheater Detected**')
    .setDescription(`🧑‍💻 **Steam Username**: \`${steamUsername}\`\n**Steam64 ID**: \`${steam64Id}\``)
    .addFields(
      { name: '📄 **Reason**', value: reason },
      { name: '🦖 **Dinosaur Class**', value: characterClass || 'Unknown' },
      { name: '🗓️ **Report Time**', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
      { name: '🌐 **Discord User**', value: discordUser }
    )
    .setColor('#FF0000')
    .setFooter({ text: 'Anticheat System' })
    .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${steam64Id}`)
        .setLabel('Confirm')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`ignore_${steam64Id}`)
        .setLabel('Ignore')
        .setStyle(ButtonStyle.Secondary)
    );

  try {
    return await logChannel.send({ embeds: [embed], components: [row] });
  } catch (error) {
    logger.error(`Error sending embed for cheater ${steam64Id}: ${error.message}`);
  }
}

// Main function to check for cheaters
module.exports = {
  async checkForCheaters(settings, client) {
    const dataPath = settings.dataPath || './data';
    const logChannelId = '1292037059804135495';

    logger.info('Starting anti-cheat check...');

    const juvenileClassesToSkip = [
      'ankyjuv', 'austrojuv', 'avajuv', 'shantjuv', 'stegojuv', 'therijuv',
      'acrojuv', 'allojuv', 'baryjuv', 'gigajuv', 'herrerajuv', 'spinojuv',
      'diablojuvs', 'diablohatchs', 'dryojuvs', 'dryohatchs', 'gallijuvs', 'gallihatchs',
      'maiajuvs', 'maiahatchs', 'pachyjuvs', 'pachyhatchs', 'parajuvs', 'parahatchs',
      'trikejuvs', 'trikehatchs', 'allojuvs', 'allohatchs', 'carnojuvs', 'carnohatchs',
      'ceratojuvs', 'ceratohatchs', 'dilojuvs', 'dilohatchs', 'gigajuvs', 'gigahatchs',
      'suchojuvs', 'suchohatchs', 'rexjuvs', 'rexhatchs', 'utahjuvs', 'utahhatchs'
    ];

    // Read all player data files
    fs.readdir(dataPath, async (err, files) => {
      if (err) {
        logger.error('Error reading player data directory:', err);
        return;
      }

      const logChannel = client.channels.cache.get(logChannelId);
      if (!logChannel) {
        logger.error('Log channel not found.');
        return;
      }

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(dataPath, file);

          let playerData;
          try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            if (!fileContent.trim()) {
              continue; // Skip empty files
            }
            playerData = JSON.parse(fileContent);
          } catch (error) {
            logger.error(`Error reading or parsing file ${file}: ${error.message}`);
            continue;
          }

          const steam64Id = path.basename(file, '.json');
          const steamUsername = await getSteamUsername(steam64Id);

          let discordUser = '❌ Not linked';
          try {
            const discordId = Object.keys(links).find(key => links[key] === steam64Id);
            if (discordId) {
              const user = await client.users.fetch(discordId);
              discordUser = `✅ ${user.tag}`;
            }
          } catch (error) {
            logger.error(`Error fetching Discord user for Steam64 ID ${steam64Id}: ${error.message}`);
          }

          const characterClass = (playerData.CharacterClass || "").toLowerCase();

          if (juvenileClassesToSkip.includes(characterClass)) {
            continue; // Skip juvenile classes
          }

          if (playerData['//IgnoredHack'] === true) {
            continue; // Skip ignored hacks
          }

          if (!playerData.UnlockedCharacters || !playerData.UnlockedCharacters.trim()) {
            const reason = 'No unlocked characters found.';
            await createCheaterEmbed(client, steam64Id, steamUsername, characterClass, reason, logChannel, discordUser);
          }
        }
      }

      logger.info('Finished processing all files.');
    });
  }
};

// Interaction handler for confirm/ignore buttons
module.exports.setupInteractionHandlers = (client) => {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const [action, steam64Id] = interaction.customId.split('_');

    try {
      // Immediately acknowledge the interaction (prevents "interaction failed")
      await interaction.deferUpdate();

      const embed = interaction.message.embeds[0];
      if (!embed) {
        logger.error('Could not retrieve embed information.');
        return interaction.followUp({ content: 'Could not retrieve embed information.', ephemeral: true });
      }

      if (action === 'confirm') {
        // Handle the confirm logic
        embed.setDescription('✅ Cheater confirmed and logged.');
        embed.setColor('#00FF00'); // Change to green for confirmation
        await interaction.message.edit({ embeds: [embed], components: [] });
        addCheaterToReportedCheaters(steam64Id, embed.fields[0].value);  // Assuming steamUsername is the first field
        logger.info(`Confirmed cheater: ${steam64Id}`);
      } else if (action === 'ignore') {
        // Handle the ignore logic
        embed.setDescription('❌ Cheater ignored.');
        embed.setColor('#FF0000'); // Change to red for ignored
        await interaction.message.edit({ embeds: [embed], components: [] });
        logger.info(`Ignored cheater: ${steam64Id}`);
      }
    } catch (error) {
      logger.error(`Error handling interaction for ${action} - ${steam64Id}: ${error.message}`);
      await interaction.followUp({ content: 'This interaction has expired. Please re-run the command.', ephemeral: true });
    }
  });
};
