const { EmbedBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');

module.exports = {
  name: 'rlt',
  description: 'Play a roulette game. Bet on red, black, or green.',
  async execute(message, args, settings) {
    const userId = message.author.id;
    const betColor = args[0]?.toLowerCase();
    const betAmount = parseInt(args[1], 10);

    const validColors = ['red', 'black', 'green'];

    // Check for invalid input
    if (!betColor || !validColors.includes(betColor) || isNaN(betAmount)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🚫 Invalid Command Usage')
        .setDescription(`You need to specify a color and a bet amount between 100 and 5000 points.\n\n**Example:** \`!rlt red 500\``)
        .setColor('#FF0000') // Red color to indicate an error
        .addFields(
          { name: 'Valid Colors', value: '🔴 `red`\n⚫ `black`\n🟢 `green`', inline: true },
          { name: 'Valid Bet Amount', value: '`100` - `5000` points', inline: true }
        )
        .setFooter({ text: 'Please try again with the correct format.' })
        .setTimestamp();

      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Ensure bet amount is within the valid range
    if (betAmount < 100 || betAmount > 5000) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🚫 Invalid Bet Amount')
        .setDescription('Your bet amount must be between 100 and 5000 points.')
        .setColor('#FF0000')
        .setFooter({ text: 'Please try again with a valid bet amount.' })
        .setTimestamp();

      return message.channel.send({ embeds: [errorEmbed] });
    }

    let userData = await readUserData(userId);
    if (!userData || userData.metadata.points < betAmount) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🚫 Insufficient Points')
        .setDescription('You do not have enough points to place this bet.')
        .setColor('#FF0000')
        .setFooter({ text: 'Please earn more points and try again.' })
        .setTimestamp();

      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Simulate the roulette spin
    const outcomes = ['red', 'black', 'green'];
    const probabilities = [48, 48, 4]; // Adjust probabilities as needed
    const randomOutcome = getRandomOutcome(outcomes, probabilities);

    // Determine the result
    let resultEmbed = new EmbedBuilder()
      .setTitle('🎰 Roulette')
      .setDescription(`${message.author.username} has spun the roulette and the ball landed on ${randomOutcome === 'red' ? '🔴' : randomOutcome === 'black' ? '⚫' : '🟢'} ${randomOutcome}.`)
      .setColor(randomOutcome === 'red' ? '#FF0000' : randomOutcome === 'black' ? '#000000' : '#00FF00')
      .setTimestamp();

    if (betColor === randomOutcome) {
      const winAmount = betColor === 'green' ? betAmount * 14 : betAmount * 2;
      userData.metadata.points += winAmount;
      resultEmbed.addFields({ name: 'Result', value: `✅ You won **${winAmount}** points!`, inline: true });
    } else {
      userData.metadata.points -= betAmount;
      resultEmbed.addFields({ name: 'Result', value: `❌ You lost **${betAmount}** points.`, inline: true });
    }

    await writeUserData(userId, userData);
    return message.channel.send({ embeds: [resultEmbed] });
  }
};

// Utility function to randomly select an outcome based on weighted probabilities
function getRandomOutcome(outcomes, probabilities) {
  const totalWeight = probabilities.reduce((acc, weight) => acc + weight, 0);
  let randomNum = Math.floor(Math.random() * totalWeight);
  
  for (let i = 0; i < outcomes.length; i++) {
    randomNum -= probabilities[i];
    if (randomNum < 0) return outcomes[i];
  }
}
