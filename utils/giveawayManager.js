const fs = require('fs');
const path = require('path');
const { readUserData, writeUserData } = require('./userData');
const winston = require('winston');

// Setup logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ],
});

const giveawayFilePath = path.join(__dirname, '../ongoingGiveaways.json');

// Check ongoing giveaways on startup
async function checkOngoingGiveaways(client, settings) {
  if (fs.existsSync(giveawayFilePath)) {
    const ongoingGiveaways = JSON.parse(fs.readFileSync(giveawayFilePath, 'utf8'));
    for (const giveaway of ongoingGiveaways) {
      resumeGiveaway(client, giveaway, settings);
    }
  } else {
    logger.debug('No ongoing giveaways file found, starting fresh.');
  }
}

// Function to resume a giveaway
async function resumeGiveaway(client, giveaway, settings) {
  const { channelId, messageId, endTime, type, points, dino, winners } = giveaway;
  const currentTime = Date.now();
  const remainingTime = endTime - currentTime;

  if (remainingTime > 0) {
    const channel = client.channels.cache.get(channelId);
    const message = await channel.messages.fetch(messageId);

    logger.debug(`Resuming giveaway ${messageId} in channel ${channelId} with ${remainingTime / 1000} seconds remaining.`);
    
    setTimeout(async () => {
      await finishGiveaway(client, giveaway, settings);
    }, remainingTime);
  } else {
    logger.debug(`Giveaway ${messageId} in channel ${channelId} has already ended.`);
    await finishGiveaway(client, giveaway, settings);
  }
}

// Function to finish a giveaway
async function finishGiveaway(client, giveaway, settings) {
  const { channelId, messageId, type, points, dino, winners } = giveaway;
  const channel = client.channels.cache.get(channelId);
  const message = await channel.messages.fetch(messageId);
  const reaction = message.reactions.cache.get('🎉');
  const users = await reaction.users.fetch();

  const eligibleUsers = [];

  for (const user of users.filter(user => !user.bot).values()) {
    const userData = await readUserData(user.id);
    if (userData && userData.metadata && userData.metadata.steam64Id) {
      eligibleUsers.push(user);
    } else {
      try {
        await user.send('Please link your Steam64 ID using the `!link` command in the appropriate channel to participate in giveaways.');
      } catch (err) {
        logger.error(`Failed to send DM to user ${user.tag}: ${err.message}`);
      }
    }
  }

  const selectedWinners = eligibleUsers.random(winners);
  if (selectedWinners.length === 0) {
    await channel.send('No eligible users entered the giveaway.');
    logger.debug('No eligible users entered the giveaway.');
  } else {
    const winnerMentions = selectedWinners.map(user => user.toString()).join(', ');
    await channel.send(`Congratulations to ${winnerMentions} for winning the giveaway!`);
    logger.debug(`Winners selected: ${winnerMentions}`);

    for (const winner of selectedWinners) {
      const userData = await readUserData(winner.id);
      if (userData) {
        if (type === 'points') {
          userData.metadata.points += parseInt(points, 10);
        } else if (type === 'dino') {
          userData.dinos = userData.dinos || {};
          userData.dinos[`Giveaway${Date.now()}`] = {
            CharacterClass: dino.CharacterClass,
            bGender: dino.bGender,
            Growth: "1.0",
            Hunger: "99999",
            Thirst: "99999",
            Health: "99999",
            Stamina: 100,
            BleedingRate: 0,
            Oxygen: 100,
            ProgressionPoints: 0,
            ProgressionTier: 1
          };
        }
        await writeUserData(winner.id, userData);

        try {
          await winner.send(`Congratulations! You have won ${type === 'points' ? `${points} points` : `a ${dino.CharacterClass}`} in the giveaway!`);
        } catch (err) {
          logger.error(`Failed to send DM to user ${winner.tag}: ${err.message}`);
        }
      }
    }
  }

  // Remove the finished giveaway from ongoingGiveaways.json
  removeGiveawayFromFile(messageId);
}

function removeGiveawayFromFile(messageId) {
  if (fs.existsSync(giveawayFilePath)) {
    const ongoingGiveaways = JSON.parse(fs.readFileSync(giveawayFilePath, 'utf8'));
    const updatedGiveaways = ongoingGiveaways.filter(g => g.messageId !== messageId);
    fs.writeFileSync(giveawayFilePath, JSON.stringify(updatedGiveaways, null, 2));
    logger.debug(`Removed giveaway ${messageId} from ongoingGiveaways.json.`);
  }
}

function saveGiveaway(giveaway) {
  let ongoingGiveaways = [];
  if (fs.existsSync(giveawayFilePath)) {
    ongoingGiveaways = JSON.parse(fs.readFileSync(giveawayFilePath, 'utf8'));
  }
  ongoingGiveaways.push(giveaway);
  fs.writeFileSync(giveawayFilePath, JSON.stringify(ongoingGiveaways, null, 2));
  logger.debug(`Saved giveaway ${giveaway.messageId} to ongoingGiveaways.json.`);
}

module.exports = {
  checkOngoingGiveaways,
  saveGiveaway
};
