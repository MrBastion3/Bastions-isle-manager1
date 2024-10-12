const { readUserData } = require('../utils/userData');

module.exports = {
    name: 'mypets',
    description: 'Displays a list of your dinos',
    execute: async (message, args) => {
        const userId = message.author.id;
        const userData = await readUserData(userId);

        if (!userData || !userData.pets || userData.pets.length === 0) {
            return message.channel.send('You don\'t have any dinos yet.');
        }

        let response = '**Your Dinos:**\n';
        userData.pets.forEach((pet, index) => {
            response += `\n${index + 1}. **${pet.name}** - Rarity: ${pet.rarity}, Level: ${pet.level}, XP: ${pet.xp}, Stage: ${pet.growth_stage}`;
        });

        message.channel.send(response);
    }
};
