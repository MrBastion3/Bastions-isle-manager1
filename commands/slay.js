const fs = require('fs');
const path = require('path');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const { isAdmin } = require('../utils/checkAdmin');
const { isCommandAllowedInChannel, sendWrongChannelMessage } = require('../utils/checkChannelPermissions');

module.exports = {
    name: 'slay',
    description: 'Admin command to slay a user\'s dinosaur.',
    adminOnly: true,  // Ensure only admins can use this command
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

        // Get the mentioned user
        const mentionedUser = message.mentions.users.first();
        if (!mentionedUser) {
            return message.channel.send('Please mention a valid user to slay their dinosaur.');
        }

        const userId = mentionedUser.id;

        // Load linked Steam64 IDs
        const linksFilePath = path.join(__dirname, '..', 'links.json');
        let links = {};
        if (fs.existsSync(linksFilePath)) {
            links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
        }

        const steam64Id = links[userId];
        if (!steam64Id) {
            return message.channel.send('Steam64 ID not linked. Please ask the user to link their account using the !link command.');
        }

        // Read in-game dinosaur data
        const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
        let gameData = {};
        if (fs.existsSync(gameDataPath)) {
            gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
        }

        // Read stored dinosaur data
        let userData = await readUserData(userId);
        if (!userData) {
            return message.channel.send('No data found for this user.');
        }

        // Create options for the dropdown menu
        const dinoOptions = [];

        // Add current in-game dinosaur to options if it exists
        if (gameData.CharacterClass && gameData.CharacterClass !== 'None') {
            dinoOptions.push({
                label: `Current Dino: ${gameData.CharacterClass}`,
                description: 'In-game',
                value: 'current'
            });
        }

        // Add stored dinosaurs to options
        if (userData.dinos) {
            for (let i = 1; i <= settings.slots; i++) {
                const key = `StoredDino${i}`;
                if (userData.dinos[key]) {
                    const dino = userData.dinos[key];
                    dinoOptions.push({
                        label: `Stored Dino ${i}: ${dino.CharacterClass}`,
                        description: `Growth [${dino.Growth}] Thirst [${dino.Thirst}]`,
                        value: key
                    });
                }
            }
        }

        if (dinoOptions.length === 0) {
            return message.channel.send('No dinosaurs found to slay.');
        }

        // Create the dropdown menu for dinosaur selection
        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_dino_slay')
                .setPlaceholder('Select a dinosaur to slay...')
                .addOptions(dinoOptions)
        );

        const sentMessage = await message.channel.send({ content: 'Select a dinosaur to slay:', components: [row] });

        const filter = interaction => interaction.customId === 'select_dino_slay' && interaction.user.id === message.author.id;
        const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async interaction => {
            const selectedDino = interaction.values[0];
            let slayedDinoName = '';

            if (selectedDino === 'current') {
                if (gameData.CharacterClass && gameData.CharacterClass !== 'None') {
                    // Slay the current in-game dinosaur (effectively sets it to None)
                    slayedDinoName = gameData.CharacterClass;
                    gameData = {}; // Reset in-game dino data
                    fs.writeFileSync(gameDataPath, JSON.stringify(gameData, null, 2));

                    const embed = new EmbedBuilder()
                        .setTitle('☠️ Dinosaur Slain!')
                        .setDescription(`**${mentionedUser.username}'s** current in-game dinosaur, **${slayedDinoName}**, has been brutally slain!`)
                        .setColor('#FF0000') // Red for punishing
                        .setThumbnail('https://your-punishing-image-url.com/skull.png') // Replace with any punishing image if you like
                        .setFooter({ text: 'Justice served. Do not disobey again!' });

                    await interaction.update({ content: 'The current dinosaur has been slain.', embeds: [embed], components: [] });
                } else {
                    await interaction.update({ content: 'Error: No current dinosaur found.', components: [] });
                }
            } else if (userData.dinos && userData.dinos[selectedDino]) {
                // Slay a stored dinosaur
                slayedDinoName = userData.dinos[selectedDino].CharacterClass;
                delete userData.dinos[selectedDino];
                await writeUserData(userId, userData);

                const embed = new EmbedBuilder()
                    .setTitle('☠️ Dinosaur Slain!')
                    .setDescription(`**${mentionedUser.username}'s** stored dinosaur, **${slayedDinoName}**, from slot ${selectedDino.replace('StoredDino', '')}, has been mercilessly slain!`)
                    .setColor('#FF0000') // Red for punishing
                    .setThumbnail('https://your-punishing-image-url.com/skull.png') // Replace with any punishing image if you like
                    .setFooter({ text: 'Do not let your dinosaurs face this fate again!' });

                await interaction.update({ content: 'The stored dinosaur has been slain.', embeds: [embed], components: [] });
            } else {
                await interaction.update({ content: 'Error: Dinosaur not found.', components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                sentMessage.edit({ content: 'No dinosaur was selected.', components: [] });
            }
        });
    },
};
