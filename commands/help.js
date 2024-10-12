const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'help',
  description: 'Displays a list of all enabled commands and their descriptions.',
  async execute(message, args, settings) {
    console.log('Executing help command');

    // Load the channel permissions (optional, if you use this for filtering commands)
    const configPath = path.join(__dirname, '../channelPermissions.json');
    let channelPermissions = {};

    try {
      channelPermissions = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (error) {
      console.error('Could not load channel permissions:', error);
    }

    // Emoji for different command types
    const adminEmoji = '🛠️'; // Admin tools emoji
    const commandEmoji = '⚙️'; // General command emoji

    // Create an embed
    const embed = new EmbedBuilder()
      .setTitle('📜 Available Commands')
      .setColor('#0099ff')
      .setDescription('Here are the commands you can use in this channel:')
      .setFooter({ text: 'Use !help <command> for more details on a specific command.' });

    // Check the allowed commands for the channel (optional)
    const allowedCommands = channelPermissions[message.channel.id] || [];

    // Construct the embed with command details
    message.client.commands.forEach(command => {
      // Exclude the help command itself
      if (command.name === 'help') return;

      // Show only commands allowed in this channel or all commands if specified (optional)
      if (allowedCommands.includes(command.name) || allowedCommands.includes('all_commands')) {
        // Description of the command
        let description = `${command.description}`;

        // Add the command to the embed without usage information
        try {
          embed.addFields({
            name: `${command.adminOnly ? adminEmoji : commandEmoji} !${command.name}`,
            value: description,
            inline: false
          });
        } catch (error) {
          console.error(`Error adding field to embed: !${command.name} - ${description}`, error);
        }
      }
    });

    console.log('Constructed embed:', JSON.stringify(embed));
    console.log('Sending embed message');

    // Attempt to send the constructed embed
    message.channel.send({ embeds: [embed] })
      .then(() => console.log('Embed message sent successfully'))
      .catch(error => console.error('Error sending embed message:', error));
  },
};
