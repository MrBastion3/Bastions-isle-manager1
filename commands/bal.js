const { EmbedBuilder } = require('discord.js');
const { readUserData } = require('../utils/userData');

module.exports = {
  name: 'bal',
  description: 'Displays the player\'s current balance.',
  async execute(message, args, settings) {
    const userId = message.author.id;
    try {
      // Fetch user data using the unified structure
      const userData = await readUserData(userId);
      
      if (!userData || !userData.metadata) {
        // Handle case where no user data or metadata is found
        return message.channel.send('No data found for this user.');
      }
      
      // Get balance from user data
      const balance = userData.metadata.points || 0;

      // Create and send embed message
      const embed = new EmbedBuilder()
        .setTitle('Your Balance')
        .setDescription(`Your current balance is: ${balance} ${settings.currencyEmoji}`)
        .setColor('#0099ff');

      message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(`Error retrieving balance for user ${userId}:`, error);
      message.channel.send('There was an error fetching your balance. Please try again later.');
    }
  },
};
