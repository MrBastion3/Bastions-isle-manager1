const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const { isAdmin } = require('../utils/checkAdmin');
const fs = require('fs');
const path = require('path');

// Utility function to check if an offense is older than 30 days
const isExpired = (timestamp) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(timestamp) < thirtyDaysAgo;
};

module.exports = {
    name: 'strike',
    description: 'Admin command to manage strikes (add/remove) and view user strike history. Regular users can view their own strikes.',
    adminOnly: false,  // Allow regular users to view their own strikes
    async execute(message, args, settings) {
        const userIsAdmin = isAdmin(message.member, settings); // Check if the user is an admin
        const mentionedUser = message.mentions.users.first();
        const user = mentionedUser || message.author;

        // Load Steam64 ID links
        const linksFilePath = path.join(__dirname, '..', 'links.json');
        let links = {};
        if (fs.existsSync(linksFilePath)) {
            links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
        }

        const steam64Id = links[user.id];
        if (!steam64Id) {
            return message.channel.send('Steam64 ID not linked. Please ask the user to link their account using the !link command.');
        }

        // Read user data
        let userData = await readUserData(user.id);
        if (!userData) {
            // Initialize user data if none exists
            userData = { metadata: { strikes: 0, warnings: 0, offenseHistory: [], strikeHistory: [] } };
        } else if (!userData.metadata) {
            // Initialize metadata if missing
            userData.metadata = { strikes: 0, warnings: 0, offenseHistory: [], strikeHistory: [] };
        }

        // Ensure offenseHistory and strikeHistory are initialized
        if (!Array.isArray(userData.metadata.offenseHistory)) {
            userData.metadata.offenseHistory = [];
        }

        if (!Array.isArray(userData.metadata.strikeHistory)) {
            userData.metadata.strikeHistory = [];
        }

        // Automatically remove offenses older than 30 days from the offense history
        userData.metadata.offenseHistory = userData.metadata.offenseHistory.filter((entry) => !isExpired(entry.timestamp));

        // Automatically remove strikes older than 30 days for minor and moderate offenses (severe offenses do not expire)
        userData.metadata.strikeHistory = userData.metadata.strikeHistory.filter((entry) => {
            if (entry.offense === 'severe') return true; // Severe offenses don't expire
            return !isExpired(entry.timestamp);
        });

        // Recalculate total strikes and warnings
        userData.metadata.strikes = userData.metadata.strikeHistory.length;
        userData.metadata.warnings = userData.metadata.offenseHistory.length;

        // If the command has no arguments, show the user’s strike and warning history (for both users and admins)
        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`📋 Strike & Warning Information for ${user.username}`)
                .setColor(userData.metadata.strikes > 0 || userData.metadata.warnings > 0 ? '#FF0000' : '#00FF00');

            if (userData.metadata.strikes === 0 && userData.metadata.warnings === 0) {
                embed.setDescription(`${user.username} has no strikes or warnings.`);
            } else {
                if (userData.metadata.warnings > 0) {
                    userData.metadata.offenseHistory.forEach((warning, index) => {
                        embed.addFields({
                            name: `Warning #${index + 1}`,
                            value: `Offense: ${warning.offense}\nDate: ${new Date(warning.timestamp).toLocaleString()}\nIssued By: ${warning.issuedBy}`,
                        });
                    });
                }

                if (userData.metadata.strikes > 0) {
                    userData.metadata.strikeHistory.forEach((strike, index) => {
                        embed.addFields({
                            name: `Strike #${index + 1}`,
                            value: `Offense: ${strike.offense}\nDate: ${new Date(strike.timestamp).toLocaleString()}\nIssued By: ${strike.issuedBy}`,
                        });
                    });
                }
            }

            return message.channel.send({ embeds: [embed] });
        }

        // Admin actions: Add or remove strikes
        const action = args[0]?.toLowerCase();

        if (!['add', 'remove'].includes(action)) {
            return message.channel.send('Invalid command. Use "!strike add @user" or "!strike remove @user".');
        }

        if (action === 'add') {
            if (!userIsAdmin) {
                return message.channel.send('You do not have permission to add strikes.');
            }

            const offenseSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_offense')
                .setPlaceholder('Select an offense level')
                .addOptions([
                    { label: 'Minor Offense', value: 'minor', description: 'Minor rule infraction.' },
                    { label: 'Moderate Offense', value: 'moderate', description: 'Moderate rule infraction.' },
                    { label: 'Severe Offense', value: 'severe', description: 'Severe rule infraction.' },
                ]);

            const row = new ActionRowBuilder().addComponents(offenseSelectMenu);
            const embed = new EmbedBuilder()
                .setTitle('Issue Strike')
                .setDescription(`Select the offense level for **${user.username}**.`)
                .setColor('#FFA500');

            await message.channel.send({ embeds: [embed], components: [row] });

            const filter = (interaction) => interaction.customId === 'select_offense' && interaction.user.id === message.author.id;
            const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

            collector.on('collect', async (interaction) => {
                const selectedOffense = interaction.values[0];
                const offenseEntry = {
                    offense: selectedOffense,
                    timestamp: new Date().toISOString(),
                    issuedBy: message.author.tag,
                };

                // Minor Offense Handling
                if (selectedOffense === 'minor') {
                    const minorOffenseCount = userData.metadata.offenseHistory.filter((entry) => entry.offense === 'minor').length + 1;

                    if (minorOffenseCount === 1) {
                        // First minor offense - Warning
                        userData.metadata.offenseHistory.push(offenseEntry);
                        const warningEmbed = new EmbedBuilder()
                            .setTitle('⚠️ Warning Issued')
                            .setDescription(`**${user.username}** has committed their first minor offense. This is a **warning**.`)
                            .setColor('#FFA500');
                        await interaction.update({ embeds: [warningEmbed], components: [] });
                    } else if (minorOffenseCount === 2) {
                        // Second minor offense - Issue a strike and suggest a kick
                        userData.metadata.strikes += 1;
                        userData.metadata.strikeHistory.push(offenseEntry);
                        const kickEmbed = new EmbedBuilder()
                            .setTitle('🚨 Strike Issued')
                            .setDescription(`**${user.username}** has received a **strike** for a second minor offense. Kick them using: \n\`/kick ${user.username} minor\` or \`/kick ${steam64Id} minor\`.`)
                            .setColor('#FF0000');
                        await interaction.update({ embeds: [kickEmbed], components: [] });
                    } else if (minorOffenseCount === 3) {
                        // Third minor offense - Issue another strike, suggest kick and 24-hour ban
                        userData.metadata.strikes += 1;
                        userData.metadata.strikeHistory.push(offenseEntry);
                        const banEmbed = new EmbedBuilder()
                            .setTitle('🚨 Strike and Ban Issued')
                            .setDescription(`**${user.username}** has received another **strike** for a third minor offense. Kick them and ban them for 24 hours using: \n\`/kick ${user.username} minor\` or \`/kick ${steam64Id} minor\` and \n\`/banid ${steam64Id} 24 minor\`.`)
                            .setColor('#FF0000');
                        await interaction.update({ embeds: [banEmbed], components: [] });
                    }
                }

                // Moderate Offense Handling
                if (selectedOffense === 'moderate') {
                    const moderateOffenseCount = userData.metadata.offenseHistory.filter((entry) => entry.offense === 'moderate').length + 1;

                    if (moderateOffenseCount === 1) {
                        // First moderate offense - Warning
                        userData.metadata.offenseHistory.push(offenseEntry);
                        const warningEmbed = new EmbedBuilder()
                            .setTitle('⚠️ Warning Issued')
                            .setDescription(`**${user.username}** has committed their first moderate offense. This is a **warning**.`)
                            .setColor('#FFA500');
                        await interaction.update({ embeds: [warningEmbed], components: [] });
                    } else if (moderateOffenseCount === 2) {
                        // Second moderate offense - Issue a strike and suggest slaying their dino
                        userData.metadata.strikes += 1;
                        userData.metadata.strikeHistory.push(offenseEntry);
                        const slayEmbed = new EmbedBuilder()
                            .setTitle('🚨 Strike Issued')
                            .setDescription(`**${user.username}** has received a **strike** for a second moderate offense. Slay their dinosaur using the \`/slay ${user.username}\` command.`)
                            .setColor('#FF0000');
                        await interaction.update({ embeds: [slayEmbed], components: [] });
                    } else if (moderateOffenseCount === 3) {
                        // Third moderate offense - Issue another strike and suggest 48-hour ban
                        userData.metadata.strikes += 1;
                        userData.metadata.strikeHistory.push(offenseEntry);
                        const banEmbed = new EmbedBuilder()
                            .setTitle('🚨 Strike and Ban Issued')
                            .setDescription(`**${user.username}** has received another **strike** for a third moderate offense. Ban them for 48 hours using: \n\`/banid ${steam64Id} 48 moderate\`.`)
                            .setColor('#FF0000');
                        await interaction.update({ embeds: [banEmbed], components: [] });
                    }
                }

                // Severe Offense Handling
                if (selectedOffense === 'severe') {
                    // Severe offense - Instant 3 strikes and permanent ban
                    userData.metadata.strikes += 3;
                    userData.metadata.strikeHistory.push(offenseEntry);
                    const banEmbed = new EmbedBuilder()
                        .setTitle('🚨 Severe Offense - Permanent Ban Issued')
                        .setDescription(`**${user.username}** has committed a severe offense. They have been issued 3 strikes and should be permanently banned from the server.\nUse: \n\`/banid ${steam64Id} 0 severe\`.`)
                        .setColor('#FF0000');
                    await interaction.update({ embeds: [banEmbed], components: [] });
                }

                // Safely write the updated userData
                await writeUserData(user.id, userData);
            });
        } else if (action === 'remove') {
            if (!userIsAdmin) {
                return message.channel.send('You do not have permission to remove strikes.');
            }

            if (userData.metadata.strikes === 0 && userData.metadata.warnings === 0) {
                return message.channel.send(`${user.username} has no strikes or warnings to remove.`);
            }

            // Remove the latest strike or warning
            if (userData.metadata.strikeHistory.length > 0) {
                userData.metadata.strikeHistory.pop();
                userData.metadata.strikes -= 1;
            } else if (userData.metadata.offenseHistory.length > 0) {
                userData.metadata.offenseHistory.pop();
                userData.metadata.warnings -= 1;
            }

            await writeUserData(user.id, userData);
            const removeEmbed = new EmbedBuilder()
                .setTitle('Strike/Warning Removed')
                .setDescription(`A strike or warning has been removed from **${user.username}**. They now have **${userData.metadata.strikes}** strike(s) and **${userData.metadata.warnings}** warning(s).`)
                .setColor('#00FF00');
            return message.channel.send({ embeds: [removeEmbed] });
        }
    },
};
