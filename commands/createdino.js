const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');
const fs = require('fs');
const path = require('path');
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
  "albertosaurus": "Albert",
  "austroraptor": "AustroS",
  "baryonyx": "Bary",
  "herrerasaurus": "Herrera",
  "velociraptor": "Velo"
};

module.exports = {
  name: 'createdino',
  description: 'Create a dinosaur for a specified user (Admin only).',
  adminOnly: true,
  async execute(message, args, settings) {
    console.log('createdino command executed'); // Debug: Check if the command is being executed

    // Check if the user has an admin role
    const isAdmin = message.member.roles.cache.some(role => settings.adminRoles.includes(role.id));

    if (!isAdmin) {
      const embed = new EmbedBuilder()
        .setTitle('Command Not Allowed')
        .setDescription(`You do not have permission to use this command.`)
        .setColor('#ff0000');
      logger.warn('Non-admin user attempted to use the createdino command.');
      return message.channel.send({ embeds: [embed] });
    }

    // Admin role check passes
    const user = message.mentions.users.first();
    if (!user) {
      const embed = new EmbedBuilder()
        .setTitle('Invalid User')
        .setDescription('Please mention a valid user.')
        .setColor('#ff0000');
      logger.warn('No valid user mentioned for the createdino command.');
      return message.channel.send({ embeds: [embed] });
    }

    const userId = user.id;

    // Load user data and check if there is an empty slot
    let userData = await readUserData(userId);
    if (!userData) {
      userData = { dinos: {} };
    }
    if (!userData.dinos) {
      userData.dinos = {};
    }

    let hasEmptySlot = false;
    for (let i = 1; i <= settings.slots; i++) {
      if (!userData.dinos[`StoredDino${i}`]) {
        hasEmptySlot = true;
        break;
      }
    }

    if (!hasEmptySlot) {
      const embed = new EmbedBuilder()
        .setTitle('No Empty Slots')
        .setDescription(`${user.tag} has no empty storage slots. They must use the \`!trash\` command to remove a dinosaur before a new one can be created.`)
        .setColor('#ff0000');
      return message.channel.send({ embeds: [embed] });
    }

    const genderSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_gender')
      .setPlaceholder('Select Gender')
      .addOptions([
        { label: 'Male', value: 'male' },
        { label: 'Female', value: 'female' }
      ]);

    const genderRow = new ActionRowBuilder().addComponents(genderSelectMenu);

    const embed = new EmbedBuilder()
      .setTitle('Create Dinosaur')
      .setDescription('Select the gender of the dinosaur.')
      .setColor('#0099ff');

    const sentMessage = await message.channel.send({ embeds: [embed], components: [genderRow] });

    const filter = interaction => interaction.user.id === message.author.id;
    const collector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

    collector.on('collect', async interaction => {
      if (interaction.customId === 'select_gender') {
        const selectedGender = interaction.values[0];
        const isFemale = selectedGender === 'female';

        const herbivoreSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_herbivore')
          .setPlaceholder('Select a Herbivore')
          .addOptions(Object.keys(herbivores).map(dino => ({
            label: `${dino.charAt(0).toUpperCase() + dino.slice(1)}`,
            value: dino
          })));

        const carnivoreSelectMenu = new StringSelectMenuBuilder()
          .setCustomId('select_carnivore')
          .setPlaceholder('Select a Carnivore')
          .addOptions(Object.keys(carnivores).map(dino => ({
            label: `${dino.charAt(0).toUpperCase() + dino.slice(1)}`,
            value: dino
          })));

        const herbivoreRow = new ActionRowBuilder().addComponents(herbivoreSelectMenu);
        const carnivoreRow = new ActionRowBuilder().addComponents(carnivoreSelectMenu);

        await interaction.update({ content: 'Select a dinosaur to create.', components: [herbivoreRow, carnivoreRow] });

        const dinoCollector = message.channel.createMessageComponentCollector({ filter, max: 1, time: 60000 });

        dinoCollector.on('collect', async dinoInteraction => {
          const selectedDino = dinoInteraction.values[0];
          const dinoClass = herbivores[selectedDino] || carnivores[selectedDino];

          for (let i = 1; i <= settings.slots; i++) {
            if (!userData.dinos[`StoredDino${i}`]) {
              userData.dinos[`StoredDino${i}`] = {
                CharacterClass: dinoClass,
                bGender: isFemale,
                Growth: "1.0",
                Hunger: "99999",
                Thirst: "99999",
                Health: "99999",
                Stamina: "99999",
                BleedingRate: 0,
                Oxygen: 100,
                ProgressionPoints: 0,
                ProgressionTier: 1
              };
              break;
            }
          }

          await writeUserData(userId, userData);

          logger.info(`Admin ${message.author.tag} created a ${selectedDino} for ${user.tag}`);
          const embed = new EmbedBuilder()
            .setTitle('Dinosaur Created')
            .setDescription(`A ${selectedGender} ${selectedDino} has been created for ${user.tag}.`)
            .setColor('#00ff00');

          await dinoInteraction.update({ embeds: [embed], components: [] });
        });

        dinoCollector.on('end', collected => {
          if (collected.size === 0) {
            sentMessage.edit({ content: 'No dinosaur was selected.', components: [] });
          }
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        sentMessage.edit({ content: 'No gender was selected.', components: [] });
      }
    });
  },
};
