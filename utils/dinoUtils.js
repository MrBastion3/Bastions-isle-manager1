const fs = require('fs');
const path = require('path');

function getDinoImagePath(dinoType, stage, baseDir) {
    const dinoDirName = dinoType.charAt(0).toUpperCase() + dinoType.slice(1);
    const dinoStageDir = path.join(baseDir, dinoDirName, stage);

    if (!fs.existsSync(dinoStageDir)) {
        return { error: `Could not find the directory for ${dinoDirName}.` };
    }

    const images = fs.readdirSync(dinoStageDir);
    if (images.length === 0) {
        return { error: `No images found for ${dinoDirName} in the ${stage} stage.` };
    }

    const selectedImage = images[Math.floor(Math.random() * images.length)];
    const imagePath = path.join(dinoStageDir, selectedImage);
    
    return { imagePath };
}

function loadOrCreateUserData(userId, baseDir) {
    const userDataPath = path.join(baseDir, `${userId}.json`);

    let userData;
    if (fs.existsSync(userDataPath)) {
        try {
            userData = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
            console.log(`Loaded user data for ${userId}:`, userData); // Log the loaded data
        } catch (error) {
            console.error(`Error parsing user data for ${userId}:`, error.message);
            console.error('Please check the JSON structure in:', userDataPath);
            throw error; // Re-throw the error to halt execution if data is malformed
        }
    } else {
        userData = {}; // Initialize with an empty object if no data exists
        console.log(`Creating new user data for ${userId}:`, userData); // Log the creation of new user data
    }

    return { userData, userDataPath };
}

function saveUserData(userData, userDataPath) {
    fs.writeFileSync(userDataPath, JSON.stringify(userData, null, 2));
    console.log(`Saved user data to ${userDataPath}`); // Log the saving of user data
}

module.exports = {
    getDinoImagePath,
    loadOrCreateUserData,
    saveUserData
};
