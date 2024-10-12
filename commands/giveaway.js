const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Setup logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] - ${message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'bot.log' })
  ],
});

const herbivores = {
  "diabloceratops": "DiabloAdultS",
  "dryosaurus": "DryoAdultS",
  "gallimimus": "GalliAdultS",
  "maiasaura": "MaiaAdultS",
  "pachycephalosaurus": "PachyAdultS",
  "parasaurolophus": "ParaAdultS",
  "triceratops": "TrikeAdultS",
  "ankylosaurus": "Anky",
  "camarasaurus": "Camara",
  "therizinosaurus": "Theri",
  "shantungosaurus": "Shant",
  "stegosaurus": "Stego",
  "puertasaurus": "Puerta",
  "ava": "Ava",
  "oro": "Oro",
  "taco": "Taco"
};

const carnivores = {
  "allosaurus": "AlloAdultS",
  "ceratosaurus": "CeratoAdultS",
  "carnotaurus": "CarnoAdultS",
  "dilophosaurus": "DiloAdultS",
  "giganotosaurus": "GigaAdultS",
  "suchomimus": "SuchoAdultS",
  "utahraptor": "UtahAdultS",
  "tyrannosaurus": "RexAdultS",
  "acrocanthosaurus": "Acro",
  "spinosaurus": "Spino",
  "albertosaurus": "Albert",
  "austroraptor": "Austro",
  "baryonyx": "Bary",
  "herrerasaurus": "Herrera",
  "velociraptor": "Velo"
};

const giveawayDurations = [
  { label: '1 Minute (Testing)', value: '1min' },
  { label: '24 Hours', value: '24h' },
  { label: '1 Week', value: '1week' }
];

const pointOptions = [
  { label: '10,000 Points', value: '10000' },
  { label: '25,000 Points', value: '25000' },
  { label: '50,000 Points', value: '50000' },
  { label: '100,000 Points', value: '100000' },
  { label: '1,000,000 Points', value: '1000000' }
];

const winnerOptions = Array.from({ length: 10 }, (_, i) => ({
  label: `${i + 1} Winner${i > 0 ? 's' : ''}`,
  value: `${i + 1}`
}));

const ongoingGiveawaysFilePath = path.join(__dirname, '../ongoingGiveaways.json');

// Load ongoing giveaways from file
function loadOngoingGiveaways() {
  if (fs.existsSync(ongoingGiveawaysFilePath)) {
    const data = fs.readFileSync(ongoingGiveawaysFilePath, 'utf8');
    return JSON.parse(data);
  }
  return [];
}

// Save ongoing giveaways to file
function saveOngoingGiveaways(ongoingGiveaways) {
  fs.writeFileSync(ongoingGiveawaysFilePath, JSON.stringify(ongoingGiveaways, null, 2));
}

// Add or update a giveaway in the ongoing giveaways list
function upsertOngoingGiveaway(ongoingGiveaways, giveawayData) {
  const existingIndex = ongoingGiveaways.findIndex(g => g.messageId === giveawayData.messageId);
  if (existingIndex >= 0) {
    ongoingGiveaways[existingIndex] = giveawayData;
  } else {
    ongoingGiveaways.push(giveawayData);
  }
  saveOngoingGiveaways(ongoingGiveaways);
}

module.exports = {
  name: 'giveaway',
  description: 'Start a giveaway for points or a dinosaur.',
  adminOnly: true,
  async execute(message, args, settings) {
    // Delete the command message immediately after it's sent
    if (message.deletable) {
      await message.delete();
    }

    logger.debug(`Executing giveaway command by user: ${message.author.tag}`);

    try {
      const embed = new EmbedBuilder()
        .setTitle('Start a Giveaway')
        .setDescription('Please select what you want to give away.')
        .setColor('#0099ff');

      const giveawayTypeSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_giveaway_type')
        .setPlaceholder('Select Giveaway Type')
        .addOptions([
          { label: 'Points', value: 'points' },
          { label: 'Dino', value: 'dino' }
        ]);

      const giveawayTypeRow = new ActionRowBuilder().addComponents(giveawayTypeSelectMenu);

      const giveawayMessage = await message.channel.send({ embeds: [embed], components: [giveawayTypeRow] });
      logger.debug('Sent giveaway type selection message.');

      const filter = interaction => interaction.customId === 'select_giveaway_type' && interaction.user.id === message.author.id;
      const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

      collector.on('collect', async interaction => {
        logger.debug('Giveaway type selected.');
        const selectedGiveawayType = interaction.values[0];

        if (selectedGiveawayType === 'points') {
          // Code for points giveaway (already written earlier)
        } else if (selectedGiveawayType === 'dino') {
          logger.debug('Starting dino giveaway setup.');
          const dinoOptions = Object.keys({ ...herbivores, ...carnivores }).sort().map(dino => ({
            label: dino.charAt(0).toUpperCase() + dino.slice(1),
            value: dino
          }));

          const dinoSelectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_dino')
            .setPlaceholder('Select a Dinosaur')
            .addOptions(dinoOptions);

          const dinoRow = new ActionRowBuilder().addComponents(dinoSelectMenu);

          const dinoEmbed = new EmbedBuilder()
            .setTitle('Dinosaur Giveaway')
            .setDescription('Please select the dinosaur to give away.')
            .setColor('#0099ff');

          await interaction.update({ embeds: [dinoEmbed], components: [dinoRow] });

          const dinoFilter = i => i.customId === 'select_dino' && i.user.id === message.author.id;
          const dinoCollector = message.channel.createMessageComponentCollector({ filter: dinoFilter, max: 1, time: 60000 });

          dinoCollector.on('collect', async dinoInteraction => {
            logger.debug('Dinosaur selected.');
            const selectedDino = dinoInteraction.values[0];

            const winnerSelectMenu = new StringSelectMenuBuilder()
              .setCustomId('select_winners')
              .setPlaceholder('Select Number of Winners')
              .addOptions(winnerOptions);

            const winnerRow = new ActionRowBuilder().addComponents(winnerSelectMenu);

            const winnersEmbed = new EmbedBuilder()
              .setTitle('Dinosaur Giveaway')
              .setDescription(`You selected the ${selectedDino}. Now, please select the number of winners.`)
              .setColor('#0099ff');

            await dinoInteraction.update({ embeds: [winnersEmbed], components: [winnerRow] });

            const winnersFilter = i => i.customId === 'select_winners' && i.user.id === message.author.id;
            const winnersCollector = message.channel.createMessageComponentCollector({ filter: winnersFilter, max: 1, time: 60000 });

            winnersCollector.on('collect', async winnersInteraction => {
              const numWinners = winnersInteraction.values[0];

              const durationSelectMenu = new StringSelectMenuBuilder()
                .setCustomId('select_duration')
                .setPlaceholder('Select Giveaway Duration')
                .addOptions(giveawayDurations);

              const durationRow = new ActionRowBuilder().addComponents(durationSelectMenu);

              const durationEmbed = new EmbedBuilder()
                .setTitle('Dinosaur Giveaway')
                .setDescription('Please select the duration of the giveaway.')
                .setColor('#0099ff');

              await winnersInteraction.update({ embeds: [durationEmbed], components: [durationRow] });

              const durationFilter = i => i.customId === 'select_duration' && i.user.id === message.author.id;
              const durationCollector = message.channel.createMessageComponentCollector({ filter: durationFilter, max: 1, time: 60000 });

              durationCollector.on('collect', async durationInteraction => {
                const selectedDuration = durationInteraction.values[0];
                let durationMs;

                switch (selectedDuration) {
                  case '1min':
                    durationMs = 60000; // 1 minute in milliseconds
                    break;
                  case '24h':
                    durationMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
                    break;
                  case '1week':
                    durationMs = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
                    break;
                }

                const giveawayEmbed = new EmbedBuilder()
                  .setTitle('🎉 Dinosaur Giveaway 🎉')
                  .setDescription(`Click the "Enter Giveaway" button to enter and win a **${selectedDino}**!`)
                  .addFields(
                    { name: 'Dinosaur', value: selectedDino },
                    { name: 'Duration', value: selectedDuration }
                  )
                  .setColor('#00ff00');

                const enterButton = new ButtonBuilder()
                  .setCustomId('enter_giveaway')
                  .setLabel('Enter Giveaway')
                  .setStyle(ButtonStyle.Success);

                const buttonRow = new ActionRowBuilder().addComponents(enterButton);

                const giveawayMessage = await message.channel.send({ embeds: [giveawayEmbed], components: [buttonRow] });
                logger.debug('Dinosaur giveaway message sent with enter button.');

                // Delete all setup messages now that the giveaway is live
                await giveawayMessage.delete();

                // Save ongoing giveaway data
                const ongoingGiveaways = loadOngoingGiveaways();
                const giveawayData = {
                  messageId: giveawayMessage.id,
                  channelId: message.channel.id,
                  durationMs,
                  endTime: Date.now() + durationMs,
                  selectedDino,
                  numWinners,
                  eligibleUsers: []
                };
                upsertOngoingGiveaway(ongoingGiveaways, giveawayData);

                // Handle button interactions for entering the giveaway
                const buttonFilter = (i) => i.customId === 'enter_giveaway';
                const buttonCollector = giveawayMessage.createMessageComponentCollector({ filter: buttonFilter, time: durationMs });

                buttonCollector.on('collect', async i => {
                  const user = i.user;
                  const links = loadLinks();
                  const steam64Id = links[user.id];

                  if (!steam64Id) {
                    try {
                      await user.send('Please link your Steam64 ID using the `!link` command in the designated channel to participate in giveaways.');
                    } catch (err) {
                      logger.error(`Failed to send DM to user ${user.tag}: ${err.message}`);
                    }
                    await i.reply({ content: 'You need to link your Steam64 ID before entering the giveaway.', ephemeral: true });
                  } else {
                    // Add the user to the eligible users list if they aren't already in it
                    if (!giveawayData.eligibleUsers.includes(user.id)) {
                      giveawayData.eligibleUsers.push(user.id);
                      upsertOngoingGiveaway(ongoingGiveaways, giveawayData);
                      await i.reply({ content: 'You have successfully entered the giveaway!', ephemeral: true });
                    } else {
                      await i.reply({ content: 'You have already entered the giveaway.', ephemeral: true });
                    }
                  }
                });

                buttonCollector.on('end', async () => {
                  const ongoingGiveaways = loadOngoingGiveaways();
                  const index = ongoingGiveaways.findIndex(g => g.messageId === giveawayMessage.id);

                  if (index >= 0) {
                    const giveawayData = ongoingGiveaways[index];

                    if (giveawayData.eligibleUsers.length === 0) {
                      await message.channel.send('No eligible users entered the giveaway.');
                      logger.debug('No eligible users entered the giveaway.');
                    } else {
                      // Randomly select winners from eligible users
                      const selectedWinners = [];
                      for (let i = 0; i < Math.min(giveawayData.numWinners, giveawayData.eligibleUsers.length); i++) {
                        const winnerId = giveawayData.eligibleUsers[Math.floor(Math.random() * giveawayData.eligibleUsers.length)];
                        selectedWinners.push(winnerId);
                      }

                      const winnerMentions = selectedWinners.map(userId => `<@${userId}>`).join(', ');
                      await message.channel.send(`Congratulations to ${winnerMentions} for winning a **${giveawayData.selectedDino}**!`);
                      logger.debug(`Winners selected: ${winnerMentions}`);
                    }

                    // Remove the completed giveaway from the ongoing giveaways list
                    ongoingGiveaways.splice(index, 1);
                    saveOngoingGiveaways(ongoingGiveaways);
                  }
                });

                logger.debug(`Dinosaur giveaway started with ${numWinners} winners and a duration of ${selectedDuration}.`);
              });
            });
          });
        }
      });

      collector.on('end', collected => {
        if (collected.size === 0) {
          logger.warn('Giveaway type selection timed out.');
          message.channel.send('Giveaway setup timed out. Please try again.');
        }
      });
    } catch (error) {
      logger.error('Error executing giveaway command:', error);
      message.channel.send('An error occurred while setting up the giveaway. Please try again later.');
    }
  },
};
