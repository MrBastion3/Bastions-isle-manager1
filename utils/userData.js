const fs = require('fs');
const path = require('path');

const userDataDir = path.join(__dirname, '..', 'userdata');

if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir);
}

const readUserData = async (userId) => {
  const filePath = path.join(userDataDir, `${userId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading user data for ${userId}: ${error}`);
    return null;
  }
};

const writeUserData = async (userId, data) => {
  const filePath = path.join(userDataDir, `${userId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

module.exports = { readUserData, writeUserData };
