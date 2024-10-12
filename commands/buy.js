const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
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

module.exports = {
  name: 'buy',
  description: 'Allows players to purchase a dinosaur.',
  async execute(message, args, settings) {
    const userId = message.author.id;
    try {
      let userData = await readUserData(userId);

      // Ensure userData and its properties are initialized
      if (!userData) {
        userData = { metadata: { points: 0, cooldowns: {} }, dinos: {} };
      } else if (!userData.dinos) {
        userData.dinos = {};
      }

      // Check for the first available slot
      let emptySlot = null;
      for (let i = 1; i <= settings.slots; i++) {
        if (!userData.dinos[`StoredDino${i}`]) {
          emptySlot = i;
          break;
        }
      }

      if (emptySlot === null) {
        const embed = new EmbedBuilder()
          .setTitle('No Available Slots')
          .setDescription('You do not have any available slots to store a new dinosaur.')
          .setColor('#ff0000');
        return message.channel.send({ embeds: [embed] });
      }

      const currencyEmoji = settings.currencyEmoji || '💰';

      const genderOptions = [
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' }
      ];

      const genderSelectMenu = new StringSelectMenuBuilder()
        .setCustomId('select_gender')
        .setPlaceholder('Select Gender')
        .addOptions(genderOptions);

      const genderRow = new ActionRowBuilder().addComponents(genderSelectMenu);

      const embed = new EmbedBuilder()
        .setTitle('Buy a Dinosaur')
        .setDescription('Select the gender of the dinosaur.')
        .setColor('#0099ff');

      const sentMessage = await message.channel.send({ embeds: [embed], components: [genderRow] });

      const filter = interaction => interaction.customId === 'select_gender' && interaction.user.id === userId;

      const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

      collector.on('collect', async interaction => {
        const selectedGender = interaction.values[0];
        const isFemale = selectedGender === 'female';

        const herbivoreOptions = Object.keys(herbivores).sort((a, b) => settings.dinoPrices[a] - settings.dinoPrices[b]).map(dino => ({
          label: `🌿 ${dino.charAt(0).toUpperCase() + dino.slice(1)} - ${settings.dinoPrices[dino]} ${currencyEmoji}`,
          value: dino
        }));

        const carnivoreOptions = Object.keys(carnivores).sort((a, b) => settings.dinoPrices[a] - settings.dinoPrices[b]).map(dino => ({
          label: `🍖 ${dino.charAt(0).toUpperCase() + dino.slice(1)} - ${settings.dinoPrices[dino]} ${currencyEmoji}`,
          value: dino
        }));

        const herbivoreSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_herbivore')
          .setPlaceholder('Select a Herbivore to buy')
          .addOptions(herbivoreOptions);

        const carnivoreSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_carnivore')
          .setPlaceholder('Select a Carnivore to buy')
          .addOptions(carnivoreOptions);

        const herbivoreRow = new ActionRowBuilder().addComponents(herbivoreSelectMenu);
        const carnivoreRow = new ActionRowBuilder().addComponents(carnivoreSelectMenu);

        await interaction.update({
          embeds: [new EmbedBuilder().setTitle('Buy a Dinosaur').setDescription(`Select a dinosaur to purchase. You have ${userData.metadata.points} ${currencyEmoji}.`).setColor('#0099ff')],
          components: [herbivoreRow, carnivoreRow]
        });

        const newFilter = newInteraction => (newInteraction.customId === 'select_herbivore' || newInteraction.customId === 'select_carnivore') && newInteraction.user.id === userId;

        const newCollector = message.channel.createMessageComponentCollector({ filter: newFilter, max: 1, time: 60000 });

        newCollector.on('collect', async newInteraction => {
          const selectedDino = newInteraction.values[0];
          const dinoPrice = settings.dinoPrices[selectedDino];

          if (userData.metadata.points >= dinoPrice) {
            userData.metadata.points -= dinoPrice;

            userData.dinos[`StoredDino${emptySlot}`] = {
              CharacterClass: herbivores[selectedDino] || carnivores[selectedDino],
              bGender: isFemale,
              Growth: "1.0",
              Hunger: "99999",  // Set Hunger to 99999
              Thirst: "99999",  // Set Thirst to 99999
              Health: "99999",  // Set Health to 99999
              Stamina: "99999",  // Set Hunger to 99999
              BleedingRate: 0,
              Oxygen: 100,
              ProgressionPoints: 0,
              ProgressionTier: 1
            };

            await writeUserData(userId, userData);

            logger.info(`User ${message.author.tag} purchased a ${selectedDino} for ${dinoPrice} points.`);
            await newInteraction.update({
              content: `You have purchased a ${selectedGender === 'female' ? 'Female' : 'Male'} ${selectedDino} for ${dinoPrice} ${currencyEmoji}!`,
              embeds: [],
              components: []
            });
          } else {
            await newInteraction.update({ content: `You do not have enough points to purchase a ${selectedDino}.`, components: [] });
          }
        });

        newCollector.on('end', async collected => {
          if (collected.size === 0) {
            try {
              await sentMessage.edit({ content: 'No dinosaur was selected.', components: [] });
            } catch (error) {
              if (error.code !== 10008) { // Ignore "Unknown Message" error, as the message might have been deleted
                console.error('Failed to edit the message:', error);
              }
            }
          }
        });
      });

    } catch (error) {
      console.error(`Error processing buy command for user ${userId}:`, error);
      message.channel.send('There was an error processing your purchase. Please try again later.');
    }
  },
};
