const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const { readUserData, writeUserData } = require('../utils/userData');
const { isCooldown, setCooldown, getCooldownTimeLeft } = require('../utils/cooldown');
const steamUtils = require('../utils/steamUtils');
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

module.exports = {
  name: 'location',
  description: 'Displays the player\'s current location on the Isle V3 map.',
  async execute(message, args, settings) {
    const userId = message.author.id;

    // Load linked Steam64 IDs
    const linksFilePath = path.join(__dirname, '..', 'links.json');
    const links = JSON.parse(fs.readFileSync(linksFilePath, 'utf8'));

    if (!links[userId]) {
      return message.channel.send({ content: '🔗 Please link your Steam64 ID first using `!link` command.', ephemeral: true });
    }

    const steam64Id = links[userId];

    // Get player data from the correct Steam64ID.json file
    const playerData = getPlayerData(steam64Id, settings);

    if (!playerData) {
      return message.channel.send({ content: '⚠️ No dinosaur data found. Please ensure you have an active dinosaur in-game.', ephemeral: true });
    }

    const coordinates = playerData.Location_Isle_V3;

    if (!coordinates) {
      return message.channel.send({ content: '⚠️ Unable to retrieve player location.', ephemeral: true });
    }

    // Debug: Log the in-game coordinates
    console.log(`In-game coordinates for ${message.author.username}: ${coordinates}`);

    // Correct the map image path
    const mapPath = path.join(__dirname, '..', 'the-isle-info', 'docs', 'img', 'media', 'map-v3.jpg');
    
    // Check if the map image exists
    if (!fs.existsSync(mapPath)) {
        console.error(`Map image not found at ${mapPath}. Please ensure the file exists.`);
        return message.channel.send('Error: Map image not found. Please contact the administrator.');
    }

    const mapImage = await loadImage(mapPath);
    const canvas = createCanvas(mapImage.width, mapImage.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the map
    ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

    // Convert coordinates to pixel positions
    const { x, y } = playerCoordinatesToPixels(coordinates);

    // Draw a larger red circle
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2, true);  // Increase the radius to 15 for better visibility
    ctx.fill();

    // Add the text 'You are here'
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = 'white';  // Set text color to white for contrast
    ctx.fillText('You are here', x + 20, y + 5);  // Position the text next to the circle

    // Convert the canvas to a buffer and send it as a Discord message attachment
    const buffer = canvas.toBuffer();
    const attachment = new AttachmentBuilder(buffer, { name: 'location.png' });
    
    // Send the image in an embed
    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setTitle('Dinosaur')
      .setFields([
        { name: 'Growth', value: '0.8', inline: true },
        { name: 'Gender', value: 'Male', inline: true },
        { name: 'Resting', value: 'False', inline: true },
        { name: 'Broken Leg', value: 'False', inline: true },
        { name: 'Bleeding', value: '0', inline: true },
      ])
      .setImage('attachment://location.png')
      .setColor('#0099ff')
      .setTimestamp();

    message.channel.send({ embeds: [embed], files: [attachment] });
  }
};

// Helper function to get player data based on Steam64 ID
function getPlayerData(steam64Id, settings) {
    // Construct the full path to the player's data file
    const gameDataPath = path.join(settings.dataPath, `${steam64Id}.json`);

    // Check if the file exists
    if (!fs.existsSync(gameDataPath)) {
        console.error(`Data file not found for Steam64 ID ${steam64Id} at ${gameDataPath}`);
        return null;
    }

    // Read and parse the player's data file
    try {
        const playerData = JSON.parse(fs.readFileSync(gameDataPath, 'utf8'));
        return playerData;
    } catch (error) {
        console.error(`Error reading or parsing the data file for Steam64 ID ${steam64Id}: ${error.message}`);
        return null;
    }
}

// Updated function to convert in-game coordinates to map coordinates
function playerCoordinatesToPixels(locationString) {
  // Parse the coordinates from the location string
  const regex = /X=([-0-9.]+) Y=([-0-9.]+) Z=([-0-9.]+)/;
  const match = regex.exec(locationString);

  if (!match) {
    console.error(`Unable to parse location data: ${locationString}`);
    return { x: 0, y: 0 };  // Default position if parsing fails
  }

  const [_, X, Y] = match.map(Number);

  const mapWidth = 2048;
  const mapHeight = 2048;
  
  const gameWorldWidth = 1200000.0;  // Example size, adjust as necessary
  const gameWorldHeight = 1200000.0;  // Example size, adjust as necessary
  
  // Convert in-game coordinates to pixel positions
  const x = ((X + (gameWorldWidth / 2)) / gameWorldWidth) * mapWidth;
  const y = ((gameWorldHeight / 2 - Y) / gameWorldHeight) * mapHeight;
  
  return { x, y };
}
