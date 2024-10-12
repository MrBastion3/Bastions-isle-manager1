const { readUserData, writeUserData } = require('../utils/userData');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

const questsFilePath = path.resolve(__dirname, '../quests/quests.json');
const quests = JSON.parse(fs.readFileSync(questsFilePath, 'utf8')).quests;

module.exports = {
    name: 'startquest',
    description: 'Starts a quest for the user',
    async execute(message, args) {
        const userId = message.author.id;
        let userData = await readUserData(userId);

        if (!userData) {
            userData = { user_id: userId, points: 0, pets: [], quests: [] };
        }

        if (!userData.quests) {
            userData.quests = [];
        }

        const quest = quests[0]; // Assuming we're using the first quest in the JSON

        // Check if the quest is already started
        if (userData.quests.some(q => q.id === quest.id)) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠ Quest Already Started')
                        .setDescription(`You have already started the quest: **${quest.name}**.`)
                ]
            });
        }

        // Initialize the quest with full data, including stages
        if (!quest.stages || quest.stages.length === 0) {
            console.error('Quest stages are missing or improperly defined in the quests.json file.');
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠ Error')
                        .setDescription('There is an issue with the quest stages. Please contact the admin.')
                ]
            });
        }

        userData.quests.push({ 
            id: quest.id, 
            name: quest.name,
            current_stage: 1, 
            stages: quest.stages // Ensure stages are properly initialized
        });
        await writeUserData(userId, userData);

        message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 Quest Started!')
                    .setDescription(`You have started the quest: **${quest.name}**! ${quest.stages[0].description}`)
            ]
        });
    }
};
