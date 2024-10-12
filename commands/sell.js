const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');

// Herbivores and Carnivores mappings
const herbivores = {
  "diabloceratops": "DiabloAdultS",
  "dryosaurus": "DryoAdultS",
  "gallimimus": "GalliAdultS",
  "maiasaura": "MaiaAdultS",
  "pachycephalosaurus": "PachyAdultS",
  "parasaurolophus": "ParaAdultS",
  "triceratops": "TrikeAdultS",
  "ankylosaurus": "Ankylo",
  "camarasaurus": "Camara",
  "therizinosaurus": "Theri",
  "shantungosaurus": "Shant",
  "stegosaurus": "Stego",
  "puertasaurus": "Puerta"
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
  "austroraptor": "AustroS",
  "baryonyx": "Bary",
  "herrerasaurus": "Herrera",
  "velociraptor": "Velo"
};

// Merge herbivores and carnivores for easy lookup
const allDinos = { ...herbivores, ...carnivores };

module.exports = {
  name: 'sell',
  description: 'Sell your stored dinosaurs for points.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    // Load linked Steam64 IDs
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    let links = {};
    if (fs.existsSync(linksFilePath)) {
      links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));
    }

    const steam64Id = links[userId];
    if (!steam64Id) {
      return message.channel.send('Steam64 ID not linked. Please use the !link command to link your account.');
    }

    // Read stored dinosaur data
    const userData = await readUserData(userId);
    if (!userData) {
      return message.channel.send('No data found for this user.');
    }

    console.log(`User data loaded: ${JSON.stringify(userData)}`);

    // Create options for the dropdown menu
    const dinoOptions = [];

    // Function to get the price of a dinosaur
    const getDinoPrice = (dinoClass) => {
      for (const [key, value] of Object.entries(allDinos)) {
        if (value === dinoClass) {
          return settings.dinoPrices[key];
        }
      }
      return null;
    };

    // Add stored dinosaurs to options if they are adult
    if (userData.dinos) {
      for (let i = 1; i <= settings.slots; i++) {
        const key = `StoredDino${i}`;
        if (userData.dinos[key] && parseFloat(userData.dinos[key].Growth) >= 1.0) {
          const dino = userData.dinos[key];
          const dinoPrice = getDinoPrice(dino.CharacterClass);
          console.log(`Checking stored dinoClass: ${dino.CharacterClass}, Price: ${dinoPrice}`);
          if (dinoPrice) {
            const sellPrice = Math.floor(dinoPrice * 0.5 * parseFloat(dino.Growth)); // 50% of original price adjusted by growth
            dinoOptions.push({
              label: `Stored Dino ${i}: ${dino.CharacterClass} - ${sellPrice} points`,
              description: `Growth [${dino.Growth}]`,
              value: key
            });
          }
        }
      }
    }

    if (dinoOptions.length === 0) {
      console.log('No adult stored dinosaurs found to sell.');
      return message.channel.send('No adult stored dinosaurs found to sell.');
    }

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('select_dino_sell')
        .setPlaceholder('Select a dinosaur to sell...')
        .addOptions(dinoOptions)
    );

    const sentMessage = await message.channel.send({ content: 'Select a dinosaur to sell:', components: [row] });

    const filter = interaction => interaction.customId === 'select_dino_sell' && interaction.user.id === userId;
    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      const selectedDino = interaction.values[0];
      const dinoData = userData.dinos[selectedDino];
      const dinoClass = dinoData.CharacterClass;

      const dinoPrice = getDinoPrice(dinoClass);
      const sellPrice = Math.floor(dinoPrice * 0.5 * parseFloat(dinoData.Growth)); // 50% of original price adjusted by growth

      // Trashing the stored dinosaur
      delete userData.dinos[selectedDino];
      await writeUserData(userId, userData);

      userData.metadata.points += sellPrice;
      await writeUserData(userId, userData);

      const embed = new EmbedBuilder()
        .setTitle('Dinosaur Sold')
        .setDescription(`Your dinosaur (${dinoClass}) has been sold for ${sellPrice} points.`)
        .setColor('#00ff00');

      await interaction.update({ content: `Dinosaur sold successfully for ${sellPrice} points.`, embeds: [embed], components: [] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: 'No dinosaur was selected.', components: [] });
      }
    });
  },
};
