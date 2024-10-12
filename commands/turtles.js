const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

// Create a cooldowns map
const cooldowns = new Map();

module.exports = {
    name: 'iliketurtles',
    description: 'A fun command that sings a turtle song!',
    async execute(message, args) {
        const cooldownTime = 60 * 60 * 1000; // 1 hour in milliseconds
        const userId = message.author.id;

        // Check if the user is in the cooldowns map
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + cooldownTime;
            const now = Date.now();

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000 / 60;
                return message.reply(`You can use this command again in ${timeLeft.toFixed(1)} minutes.`);
            }
        }

        // If not in the cooldown map or cooldown has expired, proceed and set the new cooldown
        cooldowns.set(userId, Date.now());

        const turtleSong = `
        🐢 I like turtles, turtles are cool,
        🐢 They swim in the pond, they chill by the pool.
        🌊 They’ve got hard shells, and they move real slow,
        🐢 But that doesn’t stop them, they’re ready to go!

        🐢 I like turtles, they’re my favorite crew,
        🐢 They munch on greens, they don’t need to chew.
        🌿 So if you see a turtle, give them a smile,
        🐢 They’ll wink right back, in their turtle style!

        🎶 Song by Mr.Bastion
        `;

        // Load the turtle image from the specified directory
        const turtleImage = new AttachmentBuilder('C:\\bastions-isle-bot\\turtle.png');

        const embed = new EmbedBuilder()
            .setTitle('🐢 I Like Turtles!')
            .setDescription(turtleSong)
            .setColor('#00ff99')
            .setThumbnail('attachment://turtle.png') // Reference the attached image
            .setFooter({ text: "Turtles are awesome! - Mr.Bastion", iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        // Send the message with the embed and the attached image
        message.channel.send({ embeds: [embed], files: [turtleImage] });
    },
};
