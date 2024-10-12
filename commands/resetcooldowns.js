const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { readUserData, writeUserData } = require('../utils/userData');
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
  name: 'resetcooldowns',
  description: 'Admin command to reset all player cooldowns.',
  adminOnly: true, // This property ensures the command is hidden from non-admin users in !help
  async execute(message, args, settings) {
    if (!message.member.roles.cache.some(role => settings.adminRoles.includes(role.id))) {
      return message.channel.send('You do not have permission to use this command.');
    }

    const userFilesPath = path.join(__dirname, '..', 'userdata');

    try {
      const userFiles = fs.readdirSync(userFilesPath);
      for (const file of userFiles) {
        if (file.endsWith('.json')) {
          const userId = path.basename(file, '.json');
          let userData = await readUserData(userId);
          
          if (userData && userData.cooldowns) {
            userData.cooldowns = {}; // Reset all cooldowns
            await writeUserData(userId, userData);
            logger.info(`Reset cooldowns for user ${userId}`);
          }
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('Cooldowns Reset')
        .setDescription('All player cooldowns have been successfully reset.')
        .setColor('#00ff00');

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error resetting cooldowns: ${error.message}`);
      message.channel.send('An error occurred while resetting cooldowns. Please try again later.');
    }
  },
};
