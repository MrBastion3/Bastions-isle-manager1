const { readUserData } = require('../utils/userData');
const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');

// Load the quests file
const questsFilePath = path.resolve(__dirname, '../quests/quests.json');
const allQuests = JSON.parse(fs.readFileSync(questsFilePath, 'utf8')).quests;

module.exports = {
    name: 'questprogress',
    description: 'Check your current quest progress',
    async execute(message, args) {
        const userId = message.author.id;
        let userData = await readUserData(userId);

        if (!userData || !userData.quests || userData.quests.length === 0) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠ No Active Quest')
                        .setDescription('You are not currently on any quest.')
                ]
            });
        }

        const userQuest = userData.quests[0];
        const quest = allQuests.find(q => q.id === userQuest.id);
        
        if (!quest || !quest.stages || quest.stages.length === 0) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠ Error')
                        .setDescription('There seems to be an issue with your quest data.')
                ]
            });
        }

        const currentStageIndex = userQuest.current_stage - 1;

        if (currentStageIndex < 0 || currentStageIndex >= quest.stages.length) {
            return message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠ Error')
                        .setDescription('Invalid stage index. Please report this to an admin.')
                ]
            });
        }

        const stageInfo = quest.stages[currentStageIndex];

        let progress = 0;
        if (stageInfo.task === 'send_message') {
            const messageCount = userData.messageCount || 0;
            progress = Math.min((messageCount / stageInfo.message_count) * 100, 100);
        }

        const progressMessage = progress < 100 
            ? `You are ${progress.toFixed(2)}% complete with this stage.` 
            : 'You have completed this stage!';

        message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('📜 Quest Progress')
                    .setDescription(`You are on quest **${quest.name}**. Current stage: **${stageInfo.stage}** - ${stageInfo.description}\n\n${progressMessage}`)
            ]
        });
    }
};
