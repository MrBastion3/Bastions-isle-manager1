const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { EmbedBuilder } = require('discord.js');

const logDirectory = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: path.join(logDirectory, 'bot.log') }),
  ],
});

// Add custom log method to send logs to a Discord channel via client
logger.logToChannel = async (level, message, client, channelId) => {
  logger.log({ level, message });

  const channel = client.channels.cache.get(channelId);
  if (channel) {
    const embed = new EmbedBuilder()
      .setTitle(`[${level.toUpperCase()}] - Command Log`)
      .setDescription(message)
      .setColor(level === 'info' ? '#00ff00' : '#ff0000')
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send log to Discord channel:', error);
    }
  } else {
    console.warn(`Channel with ID ${channelId} not found. Log not sent to Discord.`);
  }
};

module.exports = logger;
