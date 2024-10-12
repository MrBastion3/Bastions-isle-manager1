const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const { setCooldown, isCooldown, getCooldownTimeLeft } = require('../utils/cooldown');
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
  name: 'claim',
  description: 'Allows users with the Nitro Booster role to claim 3,000 points every 12 hours.',
  async execute(message, args, settings) {
    const userId = message.author.id;
    const claimRoleId = '1072861558620827688'; // Nitro Booster Role ID
    const claimPoints = 3000;
    const cooldownTime = 12 * 60 * 60; // 12 hours in seconds

    // Check if the user has the required role
    if (!message.member.roles.cache.has(claimRoleId)) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Access Denied')
        .setDescription('You do not have the required role to claim points.')
        .setColor('#ff0000')
        .setFooter({ text: 'Only Nitro Boosters can claim points.' })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    // Check if the user is on cooldown
    if (await isCooldown(userId, 'claim')) {
      const timeLeft = await getCooldownTimeLeft(userId, 'claim');
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);

      const embed = new EmbedBuilder()
        .setTitle("⏳ Cooldown Active")
        .setDescription(`You need to wait ${hours} hours and ${minutes} minutes before claiming points again.`)
        .setColor('#ffcc00')
        .setFooter({ text: "Come back later to claim your points!" })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    // Set the cooldown for the claim command
    await setCooldown(userId, 'claim', cooldownTime);

    // Read user data and add points
    let userData = await readUserData(userId);

    // Ensure userData and its properties are initialized
    if (!userData) {
      userData = { metadata: { points: 0, cooldowns: {} } };
    } else if (!userData.metadata) {
      userData.metadata = { points: 0, cooldowns: {} };
    }

    userData.metadata.points += claimPoints;
    await writeUserData(userId, userData);

    const currencyEmoji = settings.currencyEmoji || '💰';

    // Create success embed
    const embed = new EmbedBuilder()
      .setTitle('🎉 Points Claimed!')
      .setDescription(`You have successfully claimed **3,000** ${currencyEmoji}!`)
      .setColor('#00ff00')
      .setFooter({ text: `Your new balance is ${userData.metadata.points} ${currencyEmoji}.` })
      .setTimestamp();

    logger.info(`User ${message.author.tag} claimed 3,000 points.`);

    return message.channel.send({ embeds: [embed] });
  },
};
