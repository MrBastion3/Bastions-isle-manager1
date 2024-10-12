const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');

// Funny reasons for the dino trade
const funnyReasons = [
  "Because this dino insisted on a change of scenery 🏞️.",
  "It's 'bring your dino to work' day and I thought of you 🦖.",
  "This dino developed a crush on you 💘.",
  "This dino was causing too much drama, so it's your problem now 😅.",
  "I ran out of dino food, and I think you'll do a better job feeding it 🍖.",
  "This dino is just too cool for me 😎. It belongs with you!",
  "Because every adventurer needs a trusty dino by their side 🗺️.",
  "This dino thinks you're going places and wants in on the adventure 🚀."
];

module.exports = {
  name: 'trade',
  description: 'Trade a dinosaur with another player.',
  async execute(message, args, settings) {
    let sender = message.author;
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    
    // Load links inside the execute function to ensure the latest data
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      try {
        links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
      } catch (error) {
        console.error("Error reading links.json:", error);
        return message.channel.send("⚠️ There was an issue reading the links data.");
      }
    }

    // Check if a recipient is mentioned
    if (args.length && message.mentions.users.size) {
      const recipient = message.mentions.users.first();
      const recipientId = recipient.id;
      const senderId = sender.id;

      // Load sender's and recipient's data
      let senderData = await readUserData(senderId);
      let recipientData = await readUserData(recipientId);

      // Ensure that the `dinos` object exists for both users
      senderData.dinos = senderData.dinos || {};
      recipientData.dinos = recipientData.dinos || {};

      // Validate that both users have their Steam64 IDs linked
      if (!links[senderId]) {
        const embed = new EmbedBuilder()
          .setTitle('🔗 Sender Steam64 ID Not Linked')
          .setDescription('Your Steam64 ID must be linked to trade. Use the `!link` command to link it.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }
      if (!links[recipientId]) {
        const embed = new EmbedBuilder()
          .setTitle('🔗 Recipient Steam64 ID Not Linked')
          .setDescription('The recipient\'s Steam64 ID must be linked to trade. Ask them to use the `!link` command.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      // Check if the recipient has open slots
      const totalSlots = settings.slots || 5; // Default to 5 if settings not defined
      const currentRecipientDinos = Object.keys(recipientData.dinos || {}).filter(key => key.startsWith("StoredDino")).length;
      const availableSlots = totalSlots - currentRecipientDinos;

      if (availableSlots <= 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ No Open Slots')
          .setDescription(`${recipient.username} doesn't have any open slots for a new dino.`)
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      // Create the dropdown menu for selecting a dino from the sender's storage
      const dinosInStorage = Object.keys(senderData.dinos || {}).filter(key => key.startsWith("StoredDino"));
      if (dinosInStorage.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('❌ No Dinosaurs to Trade')
          .setDescription('You don’t have any dinosaurs in storage to trade.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      const options = dinosInStorage.map(dinoKey => {
        const dino = senderData.dinos[dinoKey];
        return {
          label: `${dino.CharacterClass} (Growth: ${dino.Growth})`,
          value: dinoKey,
        };
      });

      const dinoSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select-dino')
        .setPlaceholder('Select a dinosaur to trade 🦕')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(dinoSelectMenu);

      // Send the dropdown menu to the sender
      const menuMessage = await message.channel.send({
        content: 'Please select the dinosaur you want to trade:',
        components: [row],
        ephemeral: true,
      });

      // Handle the interaction when a dinosaur is selected
      const filter = (i) => i.user.id === senderId && i.customId === 'select-dino';
      const collector = message.channel.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (i) => {
        const selectedDinoKey = i.values[0];
        const selectedDino = senderData.dinos[selectedDinoKey];

        // Find the next available slot for the recipient
        let nextSlot = 1;
        while (recipientData.dinos[`StoredDino${nextSlot}`]) {
          nextSlot++;
        }

        // Store the dino in the recipient's next available slot
        recipientData.dinos[`StoredDino${nextSlot}`] = selectedDino;

        // Remove the dino from the sender
        delete senderData.dinos[selectedDinoKey];

        await writeUserData(senderId, senderData);
        await writeUserData(recipientId, recipientData);

        // Generate a random funny reason
        const reason = funnyReasons[Math.floor(Math.random() * funnyReasons.length)];

        // Create a trade completed embed
        const successEmbed = new EmbedBuilder()
          .setTitle('🦖 Trade Completed! 🦖')
          .setDescription(`**${sender.username}** has gifted a **${selectedDino.CharacterClass}** to **${recipient.username}**!`)
          .addFields({ name: 'Reason', value: reason })
          .setColor('#00FF00');

        // Edit the original message to show the trade completion and remove dropdown
        await i.update({
          embeds: [successEmbed],
          components: [],
          content: null // Clear the original content
        });
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          // If no selection made, clean up the original dropdown message
          menuMessage.delete().catch(console.error);
        }
      });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('❌ No Recipient Specified')
        .setDescription('You need to specify a user to trade with! Example usage: `!trade @username`')
        .setColor('#ff0000');
      message.channel.send({ embeds: [embed] });
    }
  },
};
