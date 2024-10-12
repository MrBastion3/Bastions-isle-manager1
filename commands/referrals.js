const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { readUserData, writeUserData } = require('../utils/userData');
const winston = require('winston');

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
  name: 'referral',
  description: '🎁 Use this command to indicate who referred you and reward them!',
  async execute(message, args, settings) {
    if (args.length !== 1) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid Command')
        .setDescription('Please mention the user who referred you. Format: `!referral @User`')
        .setColor('#ff0000')
        .setFooter({ text: 'Make sure to mention the user correctly!' })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    const referredByUser = message.mentions.users.first();
    if (!referredByUser) {
      const embed = new EmbedBuilder()
        .setTitle('❌ Invalid User')
        .setDescription('Please mention a valid user who referred you.')
        .setColor('#ff0000')
        .setFooter({ text: 'User not found. Try mentioning again.' })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }

    const userId = message.author.id;
    const referredByUserId = referredByUser.id;

    // Check if the user is trying to refer themselves
    if (userId === referredByUserId) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Self-Referral Not Allowed')
            .setDescription('You cannot refer yourself.')
            .setColor('#ffcc00')
            .setFooter({ text: 'Try referring another user instead.' })
            .setTimestamp()
        ]
      });
    }

    // Load existing links
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    // Check if both users have linked their Steam64 IDs
    if (!links[userId]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Not Linked')
            .setDescription('You must link your Steam64 ID using the `!link` command before indicating who referred you.')
            .setColor('#ffcc00')
            .setFooter({ text: 'Link your Steam64 ID to participate in the referral program.' })
            .setTimestamp()
        ]
      });
    }

    if (!links[referredByUserId]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ User Not Linked')
            .setDescription('The user who referred you must link their Steam64 ID using the `!link` command before you can refer them.')
            .setColor('#ffcc00')
            .setFooter({ text: 'Ask the user to link their Steam64 ID.' })
            .setTimestamp()
        ]
      });
    }

    // Load existing referrals
    const referralFilePath = path.join(__dirname, '..', 'referrals.json');
    let referrals = {};
    if (fs.existsSync(referralFilePath)) {
      referrals = JSON.parse(fs.readFileSync(referralFilePath, 'utf8'));
    }

    // Check if this user has already referred someone or been referred
    if (referrals[userId]) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Already Referred')
            .setDescription('You have already indicated who referred you.')
            .setColor('#ffcc00')
            .setFooter({ text: 'Each user can only refer or be referred once.' })
            .setTimestamp()
        ]
      });
    }

    // Check if the referred user was referred by the current user (mutual referral)
    if (referrals[referredByUserId] && referrals[referredByUserId].referrer === userId) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('⚠️ Mutual Referral Not Allowed')
            .setDescription('You cannot refer someone who has already referred you.')
            .setColor('#ffcc00')
            .setFooter({ text: 'Please refer a different user.' })
            .setTimestamp()
        ]
      });
    }

    // Record the referral
    referrals[userId] = {
      referrer: referredByUserId,
      date: new Date().toISOString()
    };
    fs.writeFileSync(referralFilePath, JSON.stringify(referrals, null, 2));

    // Reward the referrer
    let referrerData = await readUserData(referredByUserId);
    if (!referrerData) {
      referrerData = { metadata: { points: 0 } };
    }

    referrerData.metadata.points += 100000;
    await writeUserData(referredByUserId, referrerData);

    const currencyEmoji = settings.currencyEmoji || '💰';

    // Notify the referrer of the reward
    const embed = new EmbedBuilder()
      .setTitle('🎉 Referral Successful!')
      .setDescription(`${referredByUser.tag} has been rewarded **100,000** ${currencyEmoji} for referring you!`)
      .addFields(
        { name: '👥 Referrer:', value: `${referredByUser.tag}`, inline: true },
        { name: '🎁 Reward:', value: `100,000 ${currencyEmoji}`, inline: true }
      )
      .setColor('#00ff00')
      .setFooter({ text: 'Thank you for helping grow our community!' })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
