const fs = require('fs');
const path = require('path');
const winston = require('winston');

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

// Function to split long messages into chunks
function splitMessage(message, maxLength = 2000) {
  const lines = message.split('\n');
  const chunks = [];
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > maxLength) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

module.exports = {
  name: 'listhackers',
  description: 'Admin command to list all known hackers, their Steam64 IDs, and linked Discord accounts.',
  adminOnly: true,
  async execute(message, args, settings) {
    try {
      // Check if the user has one of the admin roles
      const isAdmin = message.member.roles.cache.some(role => settings.adminRoles.includes(role.id));
      if (!isAdmin) {
        return message.channel.send('❌ You do not have permission to use this command.');
      }

      const reportedCheatersFile = path.join(__dirname, '../utils/reportedCheaters.json');
      const linksFile = path.join(__dirname, '../links.json'); // This is where we store the linked Steam64 IDs

      // Check if the reportedCheaters.json file exists
      if (!fs.existsSync(reportedCheatersFile)) {
        return message.channel.send('🟢 No hackers have been reported yet.');
      }

      // Read the reportedCheaters.json file
      const reportedCheaters = JSON.parse(fs.readFileSync(reportedCheatersFile, 'utf8'));

      if (reportedCheaters.length === 0) {
        return message.channel.send('🟢 No hackers have been reported yet.');
      }

      // Load linked Steam64 IDs and Discord IDs
      let links = {};
      if (fs.existsSync(linksFile)) {
        links = JSON.parse(fs.readFileSync(linksFile, 'utf8'));
      }

      logger.info(`Processing ${reportedCheaters.length} reported hackers...`);

      // Map through the reported hackers and format the message
      const hackerList = reportedCheaters.map((hacker) => {
        const steam64Id = hacker.steam64Id;
        const steamUsername = hacker.steamUsername || 'Unknown';
        const discordId = Object.keys(links).find(key => links[key] === steam64Id);
        const discordUser = discordId ? `<@${discordId}>` : ''; // Empty if not linked

        // Construct the message string with emojis and styled text
        return `👤 **Steam Username**: \`${steamUsername}\`\n🎮 **Steam64 ID**: \`${steam64Id}\`${discordUser ? `\n🌀 **Discord User**: ${discordUser}` : ''}\n---`;
      });

      const hackerListString = hackerList.join('\n\n');

      // Split the hacker list into multiple messages if necessary
      const messageChunks = splitMessage(hackerListString);

      // Send each message chunk separately
      for (const chunk of messageChunks) {
        await message.channel.send(chunk);
      }

      logger.info(`Successfully listed ${reportedCheaters.length} hackers.`);
    } catch (error) {
      logger.error(`Error executing command 'listhackers': ${error.message}`);
      message.channel.send('❌ An error occurred while executing this command. Please try again later.');
    }
  },
};
