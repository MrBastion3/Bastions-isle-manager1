const { PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.js');

const channelPermissionsPath = path.join(__dirname, '..', 'channelPermissions.json');

function isCommandAllowedInChannel(commandName, channelId, member) {
    let channelPermissions = {};

    try {
        channelPermissions = JSON.parse(fs.readFileSync(channelPermissionsPath, 'utf8'));
    } catch (error) {
        console.error('Error loading channel permissions:', error);
    }

    const userRoles = member.roles.cache.map(role => role.id.toString());
    const adminRoles = config.adminRoles.map(roleId => roleId.toString()) || [];

    console.log(`User roles (from Discord): ${JSON.stringify(userRoles)}`);
    console.log(`Admin roles (from settings.json): ${JSON.stringify(adminRoles)}`);

    let hasDiscordAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    let hasBotAdminRole = false;

    for (const userRole of userRoles) {
        console.log(`Checking role ${userRole} against adminRoles...`);
        if (adminRoles.includes(userRole)) {
            hasBotAdminRole = true;
            console.log(`Role ${userRole} is an admin role.`);
            break;
        } else {
            console.log(`Role ${userRole} is NOT an admin role.`);
        }
    }

    console.log(`Final check - hasDiscordAdmin: ${hasDiscordAdmin}, hasBotAdminRole: ${hasBotAdminRole}`);

    if (hasDiscordAdmin || hasBotAdminRole) {
        return {
            allowed: true,
            allowedChannels: Object.keys(channelPermissions)
        };
    }

    const allowedChannels = Object.keys(channelPermissions).filter(cid => {
        const hasAccess = member.guild.channels.cache.get(cid)?.permissionsFor(member).has(PermissionsBitField.Flags.ViewChannel);
        const commands = Array.isArray(channelPermissions[cid]) ? channelPermissions[cid] : [];
        return commands.includes(commandName) && hasAccess;
    });

    return {
        allowed: allowedChannels.includes(channelId),
        allowedChannels
    };
}

function sendWrongChannelMessage(message, allowedChannels) {
    const channelMentions = allowedChannels.map(cid => `<#${cid}>`).join(', ');

    const embed = new EmbedBuilder()
        .setTitle('⛔ Wrong Channel')
        .setDescription(`The command \`${message.content.split(' ')[0]}\` cannot be used in this channel.\nPlease use it in the following channel(s): ${channelMentions}`)
        .setColor('#FF0000')
        .setFooter({ text: 'Please follow the channel rules for commands.' })
        .setTimestamp();

    message.channel.send({ embeds: [embed] });
}

module.exports = { isCommandAllowedInChannel, sendWrongChannelMessage };
