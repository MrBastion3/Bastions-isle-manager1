const XP_THRESHOLDS = {
    1: 100,  // Level 1 to 2 requires 100 XP
    2: 200,  // Level 2 to 3 requires 200 XP
    3: 400,  // Level 3 to 4 requires 400 XP
    // Continue adding thresholds as needed
};

const STAGES = {
    1: 'Hatchling',
    5: 'Juvenile',
    10: 'Sub-Adult',
    15: 'Adult',
    // Define the stages based on levels
};

function getNextLevelXp(level) {
    return XP_THRESHOLDS[level] || null; // Return the XP needed for the next level
}

function getStageForLevel(level) {
    let currentStage = 'Hatchling';
    for (const lvl in STAGES) {
        if (level >= lvl) {
            currentStage = STAGES[lvl];
        }
    }
    return currentStage;
}

module.exports = {
    getNextLevelXp,
    getStageForLevel,
};
