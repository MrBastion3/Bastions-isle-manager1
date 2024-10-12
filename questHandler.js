const { readUserData, writeUserData } = require('./utils/userData');
const { EmbedBuilder } = require('discord.js');

// Message Counting System
async function trackMessages(userId, message) {
    let userData = await readUserData(userId);

    if (!userData.messageCount) {
        userData.messageCount = 0;
    }

    userData.messageCount += 1;

    await writeUserData(userId, userData);

    return userData.messageCount;
}

// Dino Leveling System
async function levelUpDino(userId, levelToGain) {
    let userData = await readUserData(userId);

    if (!userData.dino) {
        console.error('No dino found for user.');
        return;
    }

    userData.dino.level = (userData.dino.level || 1) + levelToGain;

    await writeUserData(userId, userData);

    return userData.dino.level;
}

// Battle Tracking System
async function trackBattle(userId, isWin) {
    let userData = await readUserData(userId);

    if (!userData.battleStats) {
        userData.battleStats = {
            battlesParticipated: 0,
            battlesWon: 0
        };
    }

    userData.battleStats.battlesParticipated += 1;
    if (isWin) {
        userData.battleStats.battlesWon += 1;
    }

    await writeUserData(userId, userData);

    return userData.battleStats;
}

// Egg Management System
async function collectEgg(userId) {
    let userData = await readUserData(userId);

    if (!userData.eggs) {
        userData.eggs = [];
    }

    userData.eggs.push({ id: userData.eggs.length + 1, hatched: false });

    await writeUserData(userId, userData);

    return userData.eggs.length;
}

async function hatchEgg(userId) {
    let userData = await readUserData(userId);

    // Ensure the eggs array exists
    if (!userData.eggs) {
        userData.eggs = [];
        await writeUserData(userId, userData);
        console.error('No eggs found for user.');
        return null;
    }

    const unhatchedEgg = userData.eggs.find(egg => !egg.hatched);

    if (unhatchedEgg) {
        unhatchedEgg.hatched = true;
        await writeUserData(userId, userData);
        return unhatchedEgg;
    } else {
        console.error('No unhatched egg found.');
        return null;
    }
}

// Dino Evolution System
async function evolveDino(userId, growthStage) {
    let userData = await readUserData(userId);

    if (!userData.dino) {
        console.error('No dino found for user.');
        return;
    }

    userData.dino.growthStage = growthStage;

    await writeUserData(userId, userData);

    return userData.dino.growthStage;
}

// Exploration System
async function exploreArea(userId, area) {
    let userData = await readUserData(userId);

    if (!userData.explorations) {
        userData.explorations = [];
    }

    userData.explorations.push({ area, completed: false });

    await writeUserData(userId, userData);

    return userData.explorations.length;
}

async function completeExploration(userId) {
    let userData = await readUserData(userId);

    const activeExploration = userData.explorations.find(exp => !exp.completed);

    if (activeExploration) {
        activeExploration.completed = true;
        await writeUserData(userId, userData);
        return activeExploration;
    } else {
        console.error('No active exploration found.');
        return null;
    }
}

// Handle Quest Progression
async function handleQuestProgression(userId, message) {
    let userData = await readUserData(userId);

    if (!userData) {
        console.error(`No user data found for ${userId}.`);
        return;
    }

    if (!userData.quests || userData.quests.length === 0) {
        console.error(`User ${userId} has no active quests.`);
        return;
    }

    const quest = userData.quests[0]; // Assuming one active quest at a time

    if (!quest.stages || quest.stages.length === 0) {
        console.error(`Quest data is missing stages for user ${userId}.`);
        return;
    }

    const currentStageIndex = quest.current_stage - 1;

    // Ensure the current stage index is within bounds
    if (currentStageIndex < 0 || currentStageIndex >= quest.stages.length) {
        console.error(`Invalid current stage index for user ${userId}. Quest data might be corrupted.`);
        return;
    }

    const currentStage = quest.stages[currentStageIndex];
    let taskCompleted = false;

    switch (currentStage.task) {
        case 'send_message':
            const messageCount = await trackMessages(userId, message);
            taskCompleted = messageCount >= currentStage.message_count;
            break;

        case 'gain_xp':
            if (!userData.xp) {
                userData.xp = 0;
            }
            userData.xp += 5; // Example: Gain 5 XP per message sent
            console.log(`User ${userId} current XP: ${userData.xp} / ${currentStage.xp_required}`); // Debug log
            await writeUserData(userId, userData);
            taskCompleted = userData.xp >= currentStage.xp_required;
            break;

        case 'hatch_egg':
            const hatchedEgg = await hatchEgg(userId);
            taskCompleted = !!hatchedEgg;
            break;

        case 'level_up_dino':
            const level = await levelUpDino(userId, 1); // Example: leveling up by 1
            taskCompleted = level >= currentStage.level_required;
            break;

        case 'win_battle':
            const battleStats = await trackBattle(userId, true); // Example: assuming a win
            taskCompleted = battleStats.battlesWon >= currentStage.battle_count;
            break;

        case 'collect_eggs':
            const eggCount = await collectEgg(userId);
            taskCompleted = eggCount >= currentStage.egg_count;
            break;

        case 'evolve_dino':
            const growthStage = await evolveDino(userId, currentStage.growth_stage_required);
            taskCompleted = growthStage === currentStage.growth_stage_required;
            break;

        case 'explore':
            const explorationCount = await exploreArea(userId, 'default_area'); // Example area
            taskCompleted = explorationCount >= currentStage.exploration_count;
            break;

        case 'complete_exploration':
            const completedExploration = await completeExploration(userId);
            taskCompleted = !!completedExploration;
            break;

        default:
            console.error('Unknown task type.');
            return;
    }

    if (taskCompleted) {
        console.log(`Task completed for stage ${currentStage.stage}`);

        // Check if the current stage reward includes an egg
        if (currentStage.reward && currentStage.reward.type === 'egg') {
            await collectEgg(userId);
            console.log(`Egg rewarded to user ${userId}`); // Added logging to confirm egg collection
        }

        if (quest.current_stage < quest.stages.length) {
            quest.current_stage++;
            userData.xp = 0; // Reset XP for the next stage if applicable
            await writeUserData(userId, userData);

            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🚀 Next Stage')
                        .setDescription(quest.stages[quest.current_stage - 1].description)
                ]
            });
        } else {
            // Quest is completed
            message.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('🏆 Quest Completed!')
                        .setDescription(`Congratulations! You have completed the quest: **${quest.name}**!`)
                ]
            });

            userData.quests = userData.quests.filter(q => q.id !== quest.id);
            await writeUserData(userId, userData);
        }
    } else {
        console.log(`Task not yet completed for stage ${currentStage.stage}`);
    }
}

module.exports = { handleQuestProgression, hatchEgg };
