const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');

module.exports = {
  name: 'crime',
  description: 'Earn some points with a high chance of losing a percentage of your total balance.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    try {
      const userData = await readUserData(userId);
      const userPoints = userData.metadata.points;

      const winChance = 0.3;
      const outcome = Math.random() < winChance ? 'win' : 'lose';
      let resultMessage;
      let pointsChange;

      if (outcome === 'win') {
        const winType = Math.random();
        if (winType < 0.6) {
          pointsChange = Math.floor(userPoints * 0.1); // Small Win: 10%
        } else if (winType < 0.9) {
          pointsChange = Math.floor(userPoints * 0.2); // Medium Win: 20%
        } else {
          pointsChange = Math.floor(userPoints * 0.5); // Big Win: 50%
        }
        userData.metadata.points += pointsChange;
        resultMessage = `You committed a successful crime and earned ${pointsChange} points! Your new balance is ${userData.metadata.points} points.`;
      } else {
        const loseType = Math.random();
        if (loseType < 0.5) {
          pointsChange = Math.floor(userPoints * 0.1); // Small Loss: 10%
        } else if (loseType < 0.8) {
          pointsChange = Math.floor(userPoints * 0.2); // Medium Loss: 20%
        } else {
          pointsChange = Math.floor(userPoints * 0.5); // Big Loss: 50%
        }
        userData.metadata.points -= pointsChange;
        resultMessage = `You got caught! You lost ${pointsChange} points. Your new balance is ${userData.metadata.points} points.`;
      }

      await writeUserData(userId, userData);

      const embed = new EmbedBuilder()
        .setTitle('Crime Result')
        .setDescription(resultMessage)
        .setColor(outcome === 'win' ? '#00ff00' : '#ff0000');

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Error executing crime command for user ${userId}:`, error);
      message.channel.send('An error occurred while processing your crime. Please try again later.');
    }
  },
};
