require('dotenv').config();
const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.js');
const antiCheat = require('./utils/antiCheat');
const { isCommandAllowedInChannel, sendWrongChannelMessage } = require('./utils/checkChannelPermissions');
const logger = require('./utils/logger');
const { handleQuestProgression } = require('./questHandler');

// Load settings from settings.json
let settings;
try {
    settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8'));
    console.log('Settings loaded:', settings);
} catch (error) {
    console.error('Failed to load settings:', error.message);
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Command collection
client.commands = new Collection();

// Cache for user data
const userCache = new Map();

// Utility function to fetch and cache user data
async function getUserData(userId) {
    if (userCache.has(userId)) {
        return userCache.get(userId);
    }
    const userData = await readUserData(userId); // Assuming readUserData reads from file/database
    userCache.set(userId, userData);
    return userData;
}

// Utility function to save user data and update the cache
async function saveUserData(userId, data) {
    userCache.set(userId, data);
    await writeUserData(userId, data); // Assuming writeUserData writes to file/database
}

// Load all command files
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'commands', file));
    client.commands.set(command.name, command);
}

// Alert function to notify about a restart via DM
async function alertOnRestart() {
    const userId = '306872598057189378'; // Your Discord user ID
    try {
        const user = await client.users.fetch(userId); // Fetch the user by their ID
        if (user) {
            user.send('⚠️ The bot has restarted due to an error or crash.'); // Send the DM
        }
    } catch (error) {
        console.error('Failed to send restart alert via DM:', error);
    }
}

// Timeout wrapper for command execution
async function runCommandWithTimeout(command, message, args, settings, config, timeout = 10000) {
    const commandExecution = command.execute(message, args, settings, config);
    
    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Command execution timed out')), timeout)
    );

    return Promise.race([commandExecution, timeoutPromise]);
}

// Bot ready event
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    await alertOnRestart(); // Send a restart alert via DM

    antiCheat.checkForCheaters(settings, client);
    setInterval(() => {
        antiCheat.checkForCheaters(settings, client);
    }, 60 * 1000); // Changed to run every 60 seconds
});

// Handle messageCreate event
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Handle quest progression
    await handleQuestProgression(message.author.id, message);

    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    // Allow admins to execute any command anywhere
    console.log('Checking if command is allowed in channel');
    const { allowed, allowedChannels } = isCommandAllowedInChannel(commandName, message.channel.id, message.member);

    if (!allowed) {
        return sendWrongChannelMessage(message, allowedChannels);
    }

    // Execute the command and handle errors
    try {
        console.log(`Executing command: ${commandName} by user: ${message.author.tag}`);
        logger.logToChannel('info', `User ${message.author.tag} executed command \`${commandName}\` in channel \`${message.channel.name}\``, client, settings.logChannelId);

        // Run the command with a timeout to prevent it from hanging too long
        await runCommandWithTimeout(command, message, args, settings, config, 10000); // 10 seconds timeout
    } catch (error) {
        console.error(`Error executing command: ${commandName} - ${error.message}`);
        message.reply('There was an error trying to execute that command or it took too long to respond!');
    }
});

client.login(process.env.BOT_TOKEN);

// Handle unhandled promise rejections globally
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
    alertOnRestart(); // Send a DM alert when there's an unhandled rejection
});

// Handle uncaught exceptions globally
process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
    alertOnRestart(); // Send a DM alert when there's an uncaught exception
    process.exit(1); // Exit process to trigger restart
});
