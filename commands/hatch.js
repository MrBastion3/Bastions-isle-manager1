const { readUserData, writeUserData } = require('../utils/userData');
const { selectDinoBasedOnRarity } = require('../utils/dinoRarity');
const { hatchEgg } = require('../questHandler'); // Correct import
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'hatch',
    description: 'Hatches an egg into a dino',
    execute: async (message, args) => {
        const userId = message.author.id;

        // Attempt to hatch an egg
        const eggHatched = await hatchEgg(userId);

        if (!eggHatched) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ No Unhatched Egg Found')
                        .setDescription('It looks like you don’t have any unhatched eggs.')
                ]
            });
        }

        // Determine the dino and its rarity
        const [selectedDino, rarity] = selectDinoBasedOnRarity();

        // Define the new pet (dino)
        const newPet = {
            name: selectedDino,
            rarity: rarity,
            level: 1,
            xp: 0,
            growth_stage: 'Hatchling',
            stats: {
                health: 100,
                attack: 50,
                defense: 40,
                speed: 30
            }
        };

        // Read existing user data
        let userData = await readUserData(userId);

        if (!userData) {
            userData = {
                user_id: userId,
                points: 0,
                pets: []
            };
        }

        // Add the new pet to the user's data
        if (!userData.pets) {
            userData.pets = [];
        }

        userData.pets.push(newPet);

        // Write the updated data back to the user's file
        await writeUserData(userId, userData);

        // Send a confirmation message to the user
        message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Dino Egg Hatched!')
                    .setDescription(`Congratulations! Your egg has hatched into a **${rarity} ${selectedDino}**!`)
                    .addFields(
                        { name: 'Level', value: newPet.level.toString(), inline: true },
                        { name: 'Health', value: newPet.stats.health.toString(), inline: true },
                        { name: 'Attack', value: newPet.stats.attack.toString(), inline: true },
                        { name: 'Defense', value: newPet.stats.defense.toString(), inline: true },
                        { name: 'Speed', value: newPet.stats.speed.toString(), inline: true }
                    )
            ]
        });
    }
};
