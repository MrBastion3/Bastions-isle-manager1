const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const fs = require('fs');
const path = require('path');

const logger = require('../utils/logger');

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
  "albertosaurus": "Alberto",
  "austroraptor": "Austro",
  "baryonyx": "Bary",
  "herrerasaurus": "Herrera",
  "velociraptor": "Velo"
};

module.exports = {
  name: 'claimdinos',
  description: 'Allows players to claim 5 free dinosaurs. This command can only be used once.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    try {
      // Ensure that userData is initialized properly
      const userData = await readUserData(userId) || {};

      // Check if the user has already claimed dinos
      if (userData.claimedDinos) {
        return message.channel.send('You have already claimed your free dinosaurs.');
      }

      // Initialize dinos object if it doesn't exist
      userData.dinos = userData.dinos || {};

      // Check if all slots are empty
      if (Object.keys(userData.dinos).length > 0) {
        return message.channel.send('You must have all slots empty to claim free dinosaurs.');
      }

      let claimedDinos = [];

      // Function to select gender
      const selectGender = async (dinoNumber) => {
        const genderOptions = [
          { label: 'Male', value: 'male' },
          { label: 'Female', value: 'female' }
        ];

        const genderSelectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_gender_${dinoNumber}`)
          .setPlaceholder(`Select Gender for Dino ${dinoNumber}`)
          .addOptions(genderOptions);

        const genderRow = new ActionRowBuilder().addComponents(genderSelectMenu);

        const genderEmbed = new EmbedBuilder()
          .setTitle(`Claim Dino ${dinoNumber}`)
          .setDescription(`Please select the gender for your Dino ${dinoNumber}.`)
          .setColor('#0099ff');

        const sentMessage = await message.channel.send({ embeds: [genderEmbed], components: [genderRow] });

        const genderFilter = interaction => interaction.customId === `select_gender_${dinoNumber}` && interaction.user.id === userId;

        return new Promise((resolve, reject) => {
          const genderCollector = message.channel.createMessageComponentCollector({ filter: genderFilter, max: 1, time: 60000 });

          genderCollector.on('collect', async interaction => {
            const selectedGender = interaction.values[0];
            await interaction.update({ content: `Gender selected: ${selectedGender}`, components: [] });
            sentMessage.delete(); // Delete the gender selection message after selection
            resolve(selectedGender);
          });

          genderCollector.on('end', collected => {
            if (collected.size === 0) {
              reject('No gender selected in time.');
            }
          });
        });
      };

      // Function to select dino
      const selectDino = async (dinoNumber, selectedGender) => {
        const herbivoreOptions = Object.keys(herbivores).map(dino => ({
          label: `${dino.charAt(0).toUpperCase() + dino.slice(1)} - Herbivore`,
          value: dino
        }));

        const carnivoreOptions = Object.keys(carnivores).map(dino => ({
          label: `${dino.charAt(0).toUpperCase() + dino.slice(1)} - Carnivore`,
          value: dino
        }));

        const herbivoreSelectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_herbivore_${dinoNumber}`)
          .setPlaceholder(`Select a Herbivore for Dino ${dinoNumber}`)
          .addOptions(herbivoreOptions);

        const carnivoreSelectMenu = new StringSelectMenuBuilder()
          .setCustomId(`select_carnivore_${dinoNumber}`)
          .setPlaceholder(`Select a Carnivore for Dino ${dinoNumber}`)
          .addOptions(carnivoreOptions);

        const herbivoreRow = new ActionRowBuilder().addComponents(herbivoreSelectMenu);
        const carnivoreRow = new ActionRowBuilder().addComponents(carnivoreSelectMenu);

        const dinoEmbed = new EmbedBuilder()
          .setTitle(`Claim Dino ${dinoNumber}`)
          .setDescription('Select a dinosaur to claim.')
          .setColor('#0099ff');

        const sentMessage = await message.channel.send({ embeds: [dinoEmbed], components: [herbivoreRow, carnivoreRow] });

        const dinoFilter = interaction => (interaction.customId.startsWith('select_herbivore_') || interaction.customId.startsWith('select_carnivore_')) && interaction.user.id === userId;

        return new Promise((resolve, reject) => {
          const dinoCollector = message.channel.createMessageComponentCollector({ filter: dinoFilter, max: 1, time: 60000 });

          dinoCollector.on('collect', async interaction => {
            const selectedDino = interaction.values[0];
            const dinoClass = herbivores[selectedDino] || carnivores[selectedDino];
            claimedDinos.push({
              CharacterClass: dinoClass,
              bGender: selectedGender === 'female',
              Growth: "1.0",
              Hunger: "99999",
              Thirst: "99999",
              Health: "99999",
              Stamina: 100,
              BleedingRate: 0,
              Oxygen: 100,
              ProgressionPoints: 0,
              ProgressionTier: 1
            });
            await interaction.update({ content: `Dinosaur selected: ${selectedDino}`, components: [] });
            sentMessage.delete(); // Delete the dino selection message after selection
            resolve(selectedDino);
          });

          dinoCollector.on('end', collected => {
            if (collected.size === 0) {
              reject('No dinosaur selected in time.');
            }
          });
        });
      };

      // Loop to claim 5 dinos
      for (let i = 1; i <= 5; i++) {
        const gender = await selectGender(i);
        await selectDino(i, gender);
      }

      // Clear existing dinos and assign the claimed ones
      userData.dinos = {}; // Clear existing dinos
      claimedDinos.forEach((dino, index) => {
        userData.dinos[`StoredDino${index + 1}`] = dino;
      });

      userData.claimedDinos = true; // Mark dinos as claimed
      await writeUserData(userId, userData);

      const finalEmbed = new EmbedBuilder()
        .setTitle('Dinos Claimed')
        .setDescription(`You have successfully claimed your 5 free dinosaurs:\n${claimedDinos.map((dino, index) => `${dino.CharacterClass} (${dino.bGender ? 'female' : 'male'})`).join('\n')}`)
        .setColor('#00ff00');

      await message.channel.send({ embeds: [finalEmbed] });

    } catch (error) {
      console.error(`Error in claimdinos command: ${error.message}`);
      logger.error(`Error in claimdinos command: ${error.message}`);
      message.channel.send(`There was an error processing your request: ${error.message}`);
    }
  },
};
