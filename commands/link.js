const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { readUserData, writeUserData } = require('../utils/userData');

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
  name: 'link',
  description: '🔗 Links the player\'s Steam64 ID with their Discord account.',
  adminOnly: false,
  async execute(message, args, settings) {
    if (args.length !== 1) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Command')
        .setDescription('Please provide your Steam64 ID. Format: `!link <Steam64 ID>`')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const steam64Id = args[0];
    const userId = message.author.id;

    // Validate Steam64 ID (must be 17 digits long)
    if (!/^\d{17}$/.test(steam64Id)) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Steam64 ID')
        .setDescription('The provided Steam64 ID is not valid. Please ensure it is a 17-digit number.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    // Load existing links
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    // Check if the user's Steam64 ID is already linked to any account
    const existingUserId = Object.keys(links).find(key => links[key] === steam64Id);
    if (existingUserId && existingUserId !== userId) {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Steam64 ID Already Linked')
        .setDescription(`This Steam64 ID is already linked to another Discord account. Please contact an admin if you believe this is a mistake.`)
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    // Check if the user already has a Steam64 ID linked
    if (links[userId]) {
      const embed = new EmbedBuilder()
        .setTitle('⚠️ Steam64 ID Already Linked')
        .setDescription('Your Steam64 ID is already linked and cannot be changed. Please contact an admin if you need to unlink it.')
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    // Link the Steam64 ID with the Discord user ID
    links[userId] = steam64Id;
    fs.writeFileSync(linksFilePath, JSON.stringify(links, null, 2));

    // Update user data to set initial points only if it's their first time
    try {
      let userData = await readUserData(userId);
      
      if (!userData) {
        // First time linking, give 100,000 points
        userData = { metadata: { points: 100000 } };
      } else if (!userData.metadata) {
        userData.metadata = { points: 100000 };
      } else if (typeof userData.metadata.points === 'undefined') {
        userData.metadata.points = 100000;
      }

      await writeUserData(userId, userData);
    } catch (error) {
      logger.error(`Error updating user data for ${userId}: ${error}`);
      return message.channel.send('⚠️ An error occurred while processing your request. Please try again later.');
    }

    logger.info(`Linked Steam64 ID ${steam64Id} with Discord user ${message.author.tag}`);

    // Generate the Steam profile link
    const steamProfileLink = `https://steamcommunity.com/profiles/${steam64Id}`;

    const currencyEmoji = settings.currencyEmoji || '💰';

    const embed = new EmbedBuilder()
      .setTitle('✅ Steam64 ID Linked Successfully')
      .setDescription(`Your Steam64 ID \`${steam64Id}\` has been linked to your Discord account. You have been credited with \`100000\` ${currencyEmoji}.`)
      .addFields({ name: '🔗 Steam Profile Link', value: `[View Steam Profile](${steamProfileLink})` })
      .setColor('#0099ff')
      .setFooter({ text: 'Enjoy your time on the server!', iconURL: message.author.displayAvatarURL() })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  },
};
