const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');

const chickenEmoji = '🐔'; // Adding a chicken emoji
const COOLDOWN_TIME = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

// Configuration for the XP system
const BASE_XP = 100; // Base XP requirement for the first level
const XP_GROWTH_FACTOR = 1.5; // Growth factor for exponential XP scaling
const MAX_LEVEL = 100; // Maximum level for chickens
const XP_PER_WIN = 50; // XP earned for each win

// Function to calculate the XP required for the next level
function getXPForNextLevel(level) {
  return Math.floor(BASE_XP * Math.pow(level, XP_GROWTH_FACTOR));
}

module.exports = {
  name: 'chicken-fight',
  description: 'Gamble your points in a chicken fight. Win and get double your bet. A fair 50/50 shot (but really 51/49).',
  async execute(message, args) {
    const userId = message.author.id;
    try {
      let userData = await readUserData(userId);

      // Initialize chicken level, XP, and last fight time if they don't exist yet
      if (!userData.metadata.chickenLevel) {
        userData.metadata.chickenLevel = 1;
        userData.metadata.chickenXP = 0;
      }

      if (!userData.metadata.lastFightTime) {
        userData.metadata.lastFightTime = 0; // Initialize last fight time if it doesn't exist
      }

      const currentTime = Date.now();

      // Check if the cooldown period has passed
      const timeSinceLastFight = currentTime - userData.metadata.lastFightTime;
      if (timeSinceLastFight < COOLDOWN_TIME) {
        const timeRemaining = COOLDOWN_TIME - timeSinceLastFight;
        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

        const cooldownEmbed = new EmbedBuilder()
          .setTitle(`${chickenEmoji} Cooldown Active`)
          .setDescription(`You must wait ${hoursRemaining} hours and ${minutesRemaining} minutes before you can fight again.`)
          .setColor('#ff0000');
        
        return message.channel.send({ embeds: [cooldownEmbed] });
      }

      if (args.length !== 1 || isNaN(args[0])) {
        const embed = new EmbedBuilder()
          .setTitle(`${chickenEmoji} Invalid Command`)
          .setDescription('Please provide a valid amount of points to gamble.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      const amount = parseInt(args[0], 10);
      if (amount < 100 || amount > 5000) {
        const embed = new EmbedBuilder()
          .setTitle(`${chickenEmoji} Invalid Amount`)
          .setDescription('The bet amount must be between 100 and 5000 points.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      if (!userData || userData.metadata.points < amount) {
        return message.channel.send('You do not have enough points to gamble.');
      }

      // House has a 51% chance of winning, player has 49%
      const houseAdvantage = 0.51;
      const isWin = Math.random() >= houseAdvantage; // Player wins if random is >= 0.51

      if (isWin) {
        // 2:1 payout, player gets double their bet
        const winnings = amount * 2;
        userData.metadata.points += winnings;

        // Award XP and handle leveling up
        userData.metadata.chickenXP += XP_PER_WIN;
        let levelUp = false;

        // Check if the player has enough XP to level up
        while (
          userData.metadata.chickenLevel < MAX_LEVEL &&
          userData.metadata.chickenXP >= getXPForNextLevel(userData.metadata.chickenLevel)
        ) {
          userData.metadata.chickenXP -= getXPForNextLevel(userData.metadata.chickenLevel);
          userData.metadata.chickenLevel++;
          levelUp = true;
        }

        // Level-up notification
        const levelMessage = levelUp
          ? ` Your chicken leveled up! It is now level ${userData.metadata.chickenLevel}.`
          : '';

        const resultEmbed = new EmbedBuilder()
          .setTitle(`${chickenEmoji} Chicken Fight Result`)
          .setDescription(`You won the chicken fight! You have been awarded ${winnings} points.${levelMessage}`)
          .addFields(
            { name: 'Current Points', value: `${userData.metadata.points}` },
            { name: 'Chicken Level', value: `${userData.metadata.chickenLevel}`, inline: true },
            { name: 'XP', value: `${userData.metadata.chickenXP}/${getXPForNextLevel(userData.metadata.chickenLevel)} XP`, inline: true }
          )
          .setColor('#00ff00');

        message.channel.send({ embeds: [resultEmbed] });

      } else {
        // Player loses the amount they bet
        userData.metadata.points -= amount;

        const resultEmbed = new EmbedBuilder()
          .setTitle(`${chickenEmoji} Chicken Fight Result`)
          .setDescription(`You lost the chicken fight. You lost ${amount} points.`)
          .addFields(
            { name: 'Current Points', value: `${userData.metadata.points}` },
            { name: 'Chicken Level', value: `${userData.metadata.chickenLevel}`, inline: true },
            { name: 'XP', value: `${userData.metadata.chickenXP}/${getXPForNextLevel(userData.metadata.chickenLevel)} XP`, inline: true }
          )
          .setColor('#ff0000');

        message.channel.send({ embeds: [resultEmbed] });
      }

      // Update last fight time to the current time
      userData.metadata.lastFightTime = currentTime;

      await writeUserData(userId, userData);
      
    } catch (error) {
      console.error(`Error processing chicken fight for ${userId}:`, error);
      message.channel.send('An error occurred while processing your chicken fight. Please try again later.');
    }
  },
};
