const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'setteleportcost',
  description: 'Sets the teleportation cost (Admin only).',
  adminOnly: true,
  execute(message, args, settings) {
    if (!message.member.roles.cache.some(role => settings.adminRoles.includes(role.id))) {
      return message.channel.send('You do not have permission to use this command.');
    }

    if (args.length !== 1 || isNaN(args[0])) {
      return message.channel.send('Please provide a valid number of points.');
    }

    const newCost = parseInt(args[0], 10);
    settings.teleportCost = newCost;

    fs.writeFileSync(path.join(__dirname, '..', 'settings.json'), JSON.stringify(settings, null, 2));

    const embed = new EmbedBuilder()
      .setTitle('Teleport Cost Updated')
      .setDescription(`The teleportation cost has been set to ${newCost} points.`)
      .setColor('#0099ff');

    message.channel.send({ embeds: [embed] });
  },
};
