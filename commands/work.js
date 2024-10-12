const { readUserData, writeUserData } = require('../utils/userData');
const { setCooldown, isCooldown, getCooldownTimeLeft } = require('../utils/cooldown');
const { EmbedBuilder } = require('discord.js');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ],
});

module.exports = {
  name: 'work',
  description: 'Work to earn points.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    // Ensure the user has linked their Steam64 ID
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    const links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    if (!links[userId]) {
      return message.channel.send({ content: '🔗 Please link your Steam64 ID first using `!link` command.', ephemeral: true });
    }

    let botData = await readUserData(userId);

    // Ensure metadata and cooldowns are properly initialized
    if (!botData.metadata) {
      botData.metadata = { points: 0, cooldowns: {} };
    }
    if (!botData.metadata.cooldowns) {
      botData.metadata.cooldowns = {};
    }

    // Check if the user is on cooldown
    if (await isCooldown(userId, 'work')) {
      const timeLeft = await getCooldownTimeLeft(userId, 'work');
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);

      const cooldownEmbed = new EmbedBuilder()
        .setTitle("⏳ Cooldown Active")
        .setDescription(`You need to wait ${hours} hours and ${minutes} minutes before using the work command again.`)
        .setColor('#ffcc00')
        .setFooter({ text: "Try again later and keep working hard!" })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    // Load jobs from the jobs.json file
    const jobsFilePath = path.join(__dirname, '..', 'jobs.json');
    const jobs = JSON.parse(fs.readFileSync(jobsFilePath, 'utf8'));

    // Set the cooldown and ensure it's added to botData.metadata.cooldowns
    const cooldownTime = settings.cooldowns.work || 3600; // Cooldown time in seconds, default to 1 hour
    botData.metadata.cooldowns['work'] = Date.now() + cooldownTime * 1000;
    await writeUserData(userId, botData);
    logger.info(`Cooldown for work set for user ${userId}. Saving data...`);

    // Select a random dino job
    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];

    // Calculate a random number of points within the job's range
    const pointsEarned = Math.floor(Math.random() * (randomJob.maxPoints - randomJob.minPoints + 1)) + randomJob.minPoints;
    botData.metadata.points += pointsEarned;

    await writeUserData(userId, botData);

    // Send a response to the user
    const embed = new EmbedBuilder()
      .setTitle(`${randomJob.emoji} ${randomJob.job} Complete`)
      .setDescription(`${randomJob.description}\n\nYou earned ${settings.currencyEmoji} ${pointsEarned}! Your new balance is ${settings.currencyEmoji} ${botData.metadata.points}.`)
      .setColor('#00ff00');

    return message.channel.send({ embeds: [embed] });
  }
};
