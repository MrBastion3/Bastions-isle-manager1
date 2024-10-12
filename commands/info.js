const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const os = require('os');
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
  name: 'info',
  description: 'Displays simplified bot settings and information (Admin only).',
  adminOnly: true,
  execute(message, args) {
    try {
      const settingsPath = path.join(__dirname, '..', 'settings.json');
      let settings = {};

      // Read settings from file
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (error) {
        logger.error('Error reading settings.json:', error);
        return message.channel.send('Error reading the settings file.');
      }

      // Check if the user has one of the admin roles
      const isAdmin = message.member.roles.cache.some(role => settings.adminRoles.includes(role.id));
      if (!isAdmin) {
        return message.channel.send('You do not have permission to use this command.');
      }

      // Extract key information
      const adminRoles = settings.adminRoles.map(roleId => `<@&${roleId}>`).join(', ') || 'No admin roles set';
      const workCooldown = settings.work ? `${settings.work.cooldown / 60} minutes` : 'Not set';
      const teleportCooldown = settings.teleportCooldown ? `${settings.teleportCooldown / 60} minutes` : 'Not set';
      const teleportCost = settings.teleportCost ? `${settings.teleportCost} ${settings.currencyEmoji}` : 'Not set';

      // Collect general bot info
      const embed = new EmbedBuilder()
        .setTitle('Bot Settings Information')
        .setColor('#0099ff')
        .addFields(
          { name: 'Admin Roles', value: adminRoles, inline: false },
          { name: 'Bot Uptime', value: `${Math.floor(os.uptime() / 3600)}h ${Math.floor(os.uptime() % 3600 / 60)}m ${Math.floor(os.uptime() % 60)}s`, inline: true },
          { name: 'Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
          { name: 'Work Cooldown', value: workCooldown, inline: true },
          { name: 'Teleport Cooldown', value: teleportCooldown, inline: true },
          { name: 'Teleport Cost', value: teleportCost, inline: true },
          { name: 'Node.js Version', value: process.version, inline: true },
          { name: 'Discord.js Version', value: require('discord.js').version, inline: true },
          { name: 'Servers Count', value: `${message.client.guilds.cache.size}`, inline: true },
          { name: 'Total Users', value: `${message.client.users.cache.size}`, inline: true }
        );

      message.channel.send({ embeds: [embed] });
      logger.info(`Info command used by ${message.author.tag}`);
    } catch (error) {
      logger.error('Error executing info command:', error);
      message.channel.send('There was an error trying to execute that command!');
    }
  },
};
