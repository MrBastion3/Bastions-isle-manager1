const { PermissionsBitField } = require('discord.js');
const config = require('../config.js'); 

module.exports = {
  canExecuteCommand(message, allowedChannels, adminOnly) {
    // Check if the user has the Discord ADMINISTRATOR permission
    const hasDiscordAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    // Check if the user has a role in adminRoles from config or settings
    const hasBotAdminRole = message.member.roles.cache.some(role => config.adminRoles.includes(role.id));

    console.log(`Final check - hasDiscordAdmin: ${hasDiscordAdmin}, hasBotAdminRole: ${hasBotAdminRole}`);

    // If adminOnly, allow if the user is either a Discord admin or has the bot admin role
    if (adminOnly) {
      return hasDiscordAdmin || hasBotAdminRole;
    }

    // If the command is not admin-only, allow execution
    return true;
  },
};
