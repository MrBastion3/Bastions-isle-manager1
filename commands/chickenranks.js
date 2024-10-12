const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { readUserData } = require('../utils/userData');
const settingsPath = path.join(__dirname, '..', 'settings.json');

// Load settings
let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (error) {
  console.error('Failed to load settings:', error.message);
  process.exit(1);  // Exit the process if settings cannot be loaded
}

module.exports = {
  name: 'chicken-ranks',
  description: 'Displays your chicken rank and the top 10 chickens with the highest levels.',
  async execute(message, args) {
    try {
      // Set the data path to the userdata directory
      const dataPath = path.join(__dirname, '..', 'userdata');
      const files = fs.readdirSync(dataPath);

      const leaderboard = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const userId = path.basename(file, '.json');
          const userData = await readUserData(userId);

          if (userData && userData.metadata && typeof userData.metadata.chickenLevel === 'number') {
            leaderboard.push({
              userId,
              chickenLevel: userData.metadata.chickenLevel,
              chickenXP: userData.metadata.chickenXP
            });
          } else {
            console.warn(`User data missing or invalid for ID ${userId}`);
          }
        }
      }

      // Sort the leaderboard by chicken level in descending order
      leaderboard.sort((a, b) => b.chickenLevel - a.chickenLevel);

      // Determine the user's rank
      const userIndex = leaderboard.findIndex(user => user.userId === message.author.id);
      const userRank = userIndex !== -1 ? userIndex + 1 : 'Unranked';
      const userChickenLevel = userIndex !== -1 ? leaderboard[userIndex].chickenLevel : '0';

      // Get the top 10 users
      const topUsers = leaderboard.slice(0, 10);

      // Create the leaderboard embed
      const embed = new EmbedBuilder()
        .setTitle('🐔 Top 10 Chicken Ranks')
        .setDescription(`**${message.author.username}**, you are currently **#${userRank}** with **Level ${userChickenLevel}** chicken.\n\nHere are the top chickens:`)
        .setColor('#FFD700') // Gold color for the ranking
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/1998/1998619.png') // Chicken icon or trophy
        .setFooter({ text: 'Keep fighting to level up your chicken!' })
        .setTimestamp();

      // Split the top users into two columns
      const column1 = topUsers.slice(0, Math.ceil(topUsers.length / 2));
      const column2 = topUsers.slice(Math.ceil(topUsers.length / 2));

      // Add the first column to the embed
      let column1Text = '';
      for (const [index, user] of column1.entries()) {
        let userTag;
        try {
          const fetchedUser = await message.client.users.fetch(user.userId);
          userTag = fetchedUser.tag;
        } catch (error) {
          console.warn(`Failed to fetch user with ID ${user.userId}:`, error);
          userTag = 'Unknown User';
        }

        // Add medals for top 3 ranks only
        let rankDisplay = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1}`;
        column1Text += `${rankDisplay} - ${userTag}\nLevel: ${user.chickenLevel} | XP: ${user.chickenXP.toLocaleString()}\n\n`;
      }

      // Add the second column to the embed
      let column2Text = '';
      for (const [index, user] of column2.entries()) {
        let userTag;
        try {
          const fetchedUser = await message.client.users.fetch(user.userId);
          userTag = fetchedUser.tag;
        } catch (error) {
          console.warn(`Failed to fetch user with ID ${user.userId}:`, error);
          userTag = 'Unknown User';
        }

        // Add medals for top 3 ranks only
        let rankDisplay = index < 3 ? ['🥇', '🥈', '🥉'][index] : `#${index + 1 + column1.length}`;
        column2Text += `${rankDisplay} - ${userTag}\nLevel: ${user.chickenLevel} | XP: ${user.chickenXP.toLocaleString()}\n\n`;
      }

      // Add fields to the embed for the two columns
      embed.addFields(
        { name: 'Top Chickens (1/2)', value: column1Text || 'No players found', inline: true },
        { name: 'Top Chickens (2/2)', value: column2Text || 'No players found', inline: true }
      );

      await message.channel.send({ embeds: [embed] });

    } catch (error) {
      console.error('Error displaying chicken ranks:', error);
      await message.channel.send('An error occurred while displaying the chicken ranks.');
    }
  },
};
