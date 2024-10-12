const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'debug', // Set the logging level to debug
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
  name: 'reward',
  description: 'Claim your giveaway dinos and move them to your storage.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    try {
      const userData = await readUserData(userId);

      if (!userData || !userData.giveawayDinos || userData.giveawayDinos.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('No Rewards Available')
          .setDescription('You have no giveaway dinos to claim.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      // Identify if there's an empty storage slot
      let emptySlot = null;
      for (let i = 1; i <= settings.slots; i++) {
        if (!userData.dinos[`StoredDino${i}`]) {
          emptySlot = i;
          break;
        }
      }

      if (!emptySlot) {
        const embed = new EmbedBuilder()
          .setTitle('No Available Slots')
          .setDescription('You do not have any available slots to store a new dinosaur. Please free up a slot before claiming your reward.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      const dinoOptions = userData.giveawayDinos.map((dino, index) => ({
        label: `${dino.CharacterClass} (${dino.bGender ? 'Female' : 'Male'})`,
        value: index.toString(),
      }));

      const dinoSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_reward_dino')
        .setPlaceholder('Select a dino to claim')
        .addOptions(dinoOptions);

      const dinoRow = new ActionRowBuilder().addComponents(dinoSelectMenu);

      const embed = new EmbedBuilder()
        .setTitle('Claim Your Dino')
        .setDescription('Select the dino you want to move to your storage.')
        .setColor('#0099ff');

      const sentMessage = await message.channel.send({ embeds: [embed], components: [dinoRow] });

      const filter = interaction => interaction.customId === 'select_reward_dino' && interaction.user.id === userId;
      const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

      collector.on('collect', async interaction => {
        const selectedDinoIndex = parseInt(interaction.values[0], 10);
        const selectedDino = userData.giveawayDinos[selectedDinoIndex];

        // Move the selected dino to the empty slot
        userData.dinos[`StoredDino${emptySlot}`] = selectedDino;

        // Remove the claimed dino from giveawayDinos
        userData.giveawayDinos.splice(selectedDinoIndex, 1);
        await writeUserData(userId, userData);

        const successEmbed = new EmbedBuilder()
          .setTitle('Dino Claimed')
          .setDescription(`You have successfully claimed your ${selectedDino.CharacterClass}. It has been moved to slot ${emptySlot}.`)
          .setColor('#00ff00');

        await interaction.update({ embeds: [successEmbed], components: [] });
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          sentMessage.edit({ content: 'No dino was selected. Please use the command again to claim your dino.', components: [] });
        }
      });

    } catch (error) {
      logger.error(`Error processing reward command for user ${userId}:`, error);
      message.channel.send('An error occurred while processing your reward. Please try again later.');
    }
  },
};
