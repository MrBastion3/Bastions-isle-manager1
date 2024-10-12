const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');
const { setCooldown, isCooldown, getCooldownTimeLeft } = require('../utils/cooldown');
const steamUtils = require('../utils/steamUtils');

const locations = [
  { name: 'Dump', coordinates: 'X=-276649.406 Y=-306744.062 Z=-52196.93' },
  { name: 'The Jungle', coordinates: 'X=18316.562 Y=59853.938 Z=-72972.141' },
  { name: 'Death Pit', coordinates: 'X=-203237.844 Y=-1141.175 Z=-71487.242' },
  { name: 'Radio', coordinates: 'X=-591014.625 Y=-148121.125 Z=-26917.559' },
  { name: 'Gulf Pond', coordinates: 'X=-491616.375 Y=202733.141 Z=-57549.688' },
  { name: 'Great Falls', coordinates: 'X=-245834.297 Y=525786.688 Z=-28917.135' },
  { name: 'Aviary', coordinates: 'X=11581.899 Y=250358.562 Z=-45450.238' },
  { name: 'Port', coordinates: 'X=430142.625 Y=231793.297 Z=-72649.242' },
  { name: 'Hot Springs', coordinates: 'X=133230.141 Y=-351846.156 Z=-37096.695' },
  { name: 'Titan Lake', coordinates: 'X=19686.084 Y=-193985.469 Z=-65721.578' }
];

module.exports = {
  name: 'travel',
  description: 'Allows players to travel to a predefined location.',
  async execute(message, args, settings) {
    const teleportCost = settings.teleportCost || 10000;
    const userId = message.author.id;

    let userData;
    try {
      userData = await readUserData(userId);
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('⚠️ Error Accessing Data')
        .setDescription('There was an error accessing your data. Please try again later.')
        .setColor('#ff0000');
      console.error(`Error reading user data for Discord ID ${userId}: ${error.message}`);
      return message.channel.send({ embeds: [errorEmbed] });
    }

    if (userData.metadata.points < teleportCost) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('💰 Insufficient Points')
        .setDescription(`You need at least ${settings.currencyEmoji} ${teleportCost} to travel.`)
        .setColor('#ff0000')
        .setFooter({ text: "Earn more points before attempting to travel." });
      console.log(`User ${userId} has ${userData.metadata.points} points, needs ${teleportCost} points to travel.`);
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    const steam64Id = links[userId];
    if (!steam64Id) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🔗 Steam64 ID Not Linked')
        .setDescription('Your Steam64 ID is not linked. Please use the `!link` command to link your account.')
        .setColor('#ff0000')
        .setFooter({ text: "Link your Steam64 ID to use this command." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);
    let gameData = {};
    if (fs.existsSync(gameDataPath)) {
      gameData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
    } else {
      const errorEmbed = new EmbedBuilder()
        .setTitle('📂 Game Data Not Found')
        .setDescription('Your game data could not be found. Please contact an administrator.')
        .setColor('#ff0000')
        .setFooter({ text: "Check if your game data is saved correctly." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Check if the player is safe-logged (not currently logged into the server)
    const isLoggedIn = await steamUtils.isPlayerLoggedIn(steam64Id);
    if (isLoggedIn) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🛑 Safe-Log Required')
        .setDescription('Please safe-log before using this command.')
        .setColor('#ffcc00')
        .setFooter({ text: "Ensure you're logged out before traveling." });
      return message.channel.send({ embeds: [errorEmbed] });
    }

    // Check if the user is on cooldown
    if (await isCooldown(userId, 'travel')) {
      const timeLeft = await getCooldownTimeLeft(userId, 'travel');
      const hours = Math.floor(timeLeft / 3600);
      const minutes = Math.floor((timeLeft % 3600) / 60);

      const cooldownEmbed = new EmbedBuilder()
        .setTitle('⏳ Cooldown Active')
        .setDescription(`You need to wait ${hours} hours and ${minutes} minutes before traveling again.`)
        .setColor('#ffcc00')
        .setFooter({ text: "Try again later." })
        .setTimestamp();

      return message.channel.send({ embeds: [cooldownEmbed] });
    }

    const pinEmoji = '📍';
    const locationOptions = locations.map(location => ({
      label: `${pinEmoji} ${location.name}`,
      value: location.coordinates
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_location')
        .setPlaceholder('Select a location...')
        .addOptions(locationOptions)
    );

    const sentMessage = await message.channel.send({ content: 'Select a location to travel to:', components: [row] });

    const filter = (interaction) => interaction.customId === 'select_location' && interaction.user.id === userId;
    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedLocation = interaction.values[0];
      const [xCoord, yCoord, zCoord] = selectedLocation.split(' ').map(coord => coord.split('=')[1]);

      // Update game data with new coordinates
      gameData.Location_Isle_V3 = `X=${xCoord} Y=${yCoord} Z=${zCoord}`;
      fs.writeFileSync(gameDataPath, JSON.stringify(gameData, null, 2));

      userData.metadata.points -= teleportCost;
      await writeUserData(userId, userData);

      // Set the travel cooldown
      const cooldownTime = settings.cooldowns.travel || 3600; // Cooldown time in seconds, default to 1 hour
      await setCooldown(userId, 'travel', cooldownTime);

      const locationName = locations.find(location => location.coordinates === selectedLocation).name;

      const successEmbed = new EmbedBuilder()
        .setTitle('✈️ Travel Complete')
        .setDescription(`You have been teleported to ${locationName}. ${settings.currencyEmoji} ${teleportCost} has been deducted from your balance.`)
        .setColor('#00ff00');

      interaction.update({ content: null, embeds: [successEmbed], components: [] });
    });

    collector.on('end', async collected => {
      if (collected.size === 0) {
        try {
          await sentMessage.edit({ content: 'No location was selected.', components: [] });
        } catch (error) {
          console.error('Error editing message:', error);
        }
      }
    });
  },
};
