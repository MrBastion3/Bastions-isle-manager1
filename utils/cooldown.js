const { readUserData, writeUserData } = require('./userData');

async function setCooldown(userId, command, cooldownDuration) {
  const userData = await readUserData(userId);
  
  if (!userData.metadata) {
    userData.metadata = { points: 0, cooldowns: {} };
  }
  if (!userData.metadata.cooldowns) {
    userData.metadata.cooldowns = {};
  }

  const timestamp = Date.now() + cooldownDuration * 1000;
  userData.metadata.cooldowns[command] = timestamp;
  
  await writeUserData(userId, userData);
}

async function isCooldown(userId, command) {
  const userData = await readUserData(userId);
  
  if (!userData.metadata || !userData.metadata.cooldowns || !userData.metadata.cooldowns[command]) {
    return false;
  }
  
  const timestamp = userData.metadata.cooldowns[command];
  return timestamp > Date.now();
}

async function getCooldownTimeLeft(userId, command) {
  const userData = await readUserData(userId);
  
  if (!userData.metadata || !userData.metadata.cooldowns || !userData.metadata.cooldowns[command]) {
    return 0;
  }
  
  const timestamp = userData.metadata.cooldowns[command];
  return (timestamp - Date.now()) / 1000; // Returns time left in seconds
}

module.exports = { setCooldown, isCooldown, getCooldownTimeLeft };
