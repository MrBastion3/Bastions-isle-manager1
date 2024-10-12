const { EmbedBuilder } = require('discord.js');
const { isCommandAllowedInChannel, sendWrongChannelMessage } = require('../utils/checkChannelPermissions');
const { readUserData, writeUserData } = require('../utils/userData');
const { isAdmin } = require('../utils/checkAdmin');

module.exports = {
    name: 'points',
    description: 'Admin command to manage user points.',
    adminOnly: true,
    async execute(message, args, settings) {
        // Log the user's roles and check if they are an admin
        console.log(`User roles: ${message.member.roles.cache.map(role => role.id)}`);
        const userIsAdmin = isAdmin(message.member, settings);
        console.log(`Is user admin: ${userIsAdmin}`);

        // Check if the user is a bot admin
        if (!userIsAdmin) {
            return message.channel.send('You do not have permission to use this command.');
        }

        // Bypass channel restrictions for admins
        const { allowed, allowedChannels } = isCommandAllowedInChannel(this.name, message.channel.id, message.member);

        if (!allowed && !userIsAdmin) {
            return sendWrongChannelMessage(message, allowedChannels);
        }

        if (args.length < 3) {
            return message.channel.send('Incorrect command usage. Format: !points add/remove <amount> <@user>');
        }

        const action = args[0];
        const amount = parseInt(args[1], 10);
        const user = message.mentions.users.first();

        if (!user) {
            return message.channel.send('Please mention a valid user.');
        }

        if (isNaN(amount) || amount <= 0) {
            return message.channel.send('Please specify a valid number of points.');
        }

        try {
            let userData = await readUserData(user.id);

            if (!userData) {
                userData = { metadata: { points: 0, cooldowns: {} }, dinos: {} };
            } else if (!userData.metadata) {
                userData.metadata = { points: 0, cooldowns: {} };
            } else if (typeof userData.metadata.points === 'undefined') {
                userData.metadata.points = 0;
            }

            if (action === 'add') {
                userData.metadata.points += amount;
            } else if (action === 'remove') {
                userData.metadata.points = Math.max(userData.metadata.points - amount, 0);
            } else {
                return message.channel.send('Invalid action. Use "add" or "remove".');
            }

            await writeUserData(user.id, userData);

            const embed = new EmbedBuilder()
                .setTitle('Points Updated')
                .setDescription(`${amount} points have been ${action === 'add' ? 'added to' : 'removed from'} ${user.username}. They now have ${userData.metadata.points} points.`)
                .setColor(action === 'add' ? '#00ff00' : '#ff0000');

            message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(`Error updating points for user ${user.id}:`, error);
            message.channel.send('There was an error processing your request. Please try again later.');
        }
    },
};
