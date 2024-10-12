const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'reload',
    description: 'Reloads a command or all commands',
    async execute(message, args) {
        // Check if the user has the correct ID
        if (message.author.id !== '306872598057189378') {
            const noPermissionEmbed = new EmbedBuilder()
                .setTitle('⛔ Access Denied')
                .setDescription('You do not have permission to use this command.')
                .setColor('#ff0000');
            return message.channel.send({ embeds: [noPermissionEmbed] });
        }

        if (!args.length) {
            const noCommandEmbed = new EmbedBuilder()
                .setTitle('❓ No Command Provided')
                .setDescription('Father, you didn\'t specify any command to reload!')
                .setColor('#ffcc00');
            return message.channel.send({ embeds: [noCommandEmbed] });
        }

        const commandName = args[0].toLowerCase();

        if (commandName === 'all') {
            // Reload all commands
            const commandFiles = fs.readdirSync(path.join(__dirname)).filter(file => file.endsWith('.js'));
            let successCount = 0;
            let errorCount = 0;

            for (const file of commandFiles) {
                const commandPath = path.join(__dirname, file);
                try {
                    delete require.cache[require.resolve(commandPath)];
                    const newCommand = require(commandPath);
                    message.client.commands.set(newCommand.name, newCommand);
                    successCount++;
                } catch (error) {
                    console.error(`Error reloading command ${file}:`, error);
                    errorCount++;
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setTitle('🔄 All Commands Reloaded')
                .setDescription(`Father, all commands have been reloaded. Success: ${successCount}, Errors: ${errorCount}`)
                .setColor('#00ff00');
            return message.channel.send({ embeds: [resultEmbed] });
        }

        // Reload a specific command
        const command = message.client.commands.get(commandName)
            || message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) {
            const noSuchCommandEmbed = new EmbedBuilder()
                .setTitle('🚫 Command Not Found')
                .setDescription(`Father, there is no command with the name or alias \`${commandName}\`.`)
                .setColor('#ff0000');
            return message.channel.send({ embeds: [noSuchCommandEmbed] });
        }

        const commandPath = path.join(__dirname, `${commandName}.js`);
        
        // Delete the cached version of the command
        delete require.cache[require.resolve(commandPath)];

        try {
            const newCommand = require(commandPath);
            message.client.commands.set(newCommand.name, newCommand);

            const successEmbed = new EmbedBuilder()
                .setTitle('🔄 Command Reloaded')
                .setDescription(`Father, the command \`${newCommand.name}\` has been reloaded successfully!`)
                .setColor('#00ff00');
            message.channel.send({ embeds: [successEmbed] });
        } catch (error) {
            console.error(error);

            const errorEmbed = new EmbedBuilder()
                .setTitle('⚠️ Error Reloading Command')
                .setDescription(`Father, there was an error while reloading the command \`${commandName}\`:\n\`${error.message}\``)
                .setColor('#ff0000');
            message.channel.send({ embeds: [errorEmbed] });
        }
    },
};
