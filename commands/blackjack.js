const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readUserData, writeUserData } = require('../utils/userData');

// Card emoji representations for simplicity
const cardEmojis = {
  'A': '🅰️', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣', '5': '5️⃣',
  '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣', '10': '🔟',
  'J': '🎃', 'Q': '👸', 'K': '🤴'
};

// Card values for blackjack
const cardValues = {
  'A': [1, 11], '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 10, 'Q': 10, 'K': 10
};

// Roasts for when the player loses
const roasts = [
  "Did you really think you'd win? 😂",
  "Better luck next time, champ! 🤣",
  "Oof, that was rough. Maybe stick to checkers? 😜",
  "Is that all you've got? 😆",
  "Yikes! I'd quit while you're behind! 😬",
  "Don't feel bad, I'm just that good! 😎",
  "Looks like the house wins again! 😂"
];

// Function to draw a card from the deck
function drawCard(deck) {
  const randomIndex = Math.floor(Math.random() * deck.length);
  return deck.splice(randomIndex, 1)[0]; // Remove card from deck and return it
}

// Function to calculate hand value
function calculateHandValue(hand) {
  let sum = 0;
  let aceCount = 0;

  hand.forEach(card => {
    if (card === 'A') {
      aceCount++;
      sum += 11; // Consider ace as 11 first
    } else {
      sum += cardValues[card];
    }
  });

  // Adjust Aces from 11 to 1 if necessary to avoid busting
  while (sum > 21 && aceCount > 0) {
    sum -= 10; // Convert one ace from 11 to 1
    aceCount--;
  }

  return sum;
}

// Function to create the deck
function createDeck() {
  const suits = ['♠️', '♥️', '♣️', '♦️'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];

  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(rank);
    });
  });

  return deck;
}

module.exports = {
  name: 'blackjack',
  description: 'Play a game of blackjack with betting!',
  async execute(message, args) {
    const betAmount = parseInt(args[0], 10);

    // Check if the bet amount is valid
    if (isNaN(betAmount) || betAmount < 100 || betAmount > 5000) {
      return message.reply('Please place a valid bet between 100 and 5000.');
    }

    const userId = message.author.id;
    let userData = await readUserData(userId);

    // Ensure the user has enough points to place the bet
    if (!userData || userData.metadata.points < betAmount) {
      return message.reply('You do not have enough points to place that bet.');
    }

    // Deduct the bet from the user's points
    userData.metadata.points -= betAmount;
    await writeUserData(userId, userData);

    const playerHand = [];
    const dealerHand = [];
    let deck = createDeck();

    // Initial deal - 2 cards for player and dealer
    playerHand.push(drawCard(deck));
    playerHand.push(drawCard(deck));
    dealerHand.push(drawCard(deck));
    dealerHand.push(drawCard(deck));

    // Calculate hand values
    let playerValue = calculateHandValue(playerHand);
    let dealerVisibleValue = calculateHandValue([dealerHand[0]]); // Only show the first dealer card value

    // Display initial game state with hidden dealer second card
    const embed = new EmbedBuilder()
      .setTitle('🃏 Blackjack')
      .setDescription(`You placed a bet of **${betAmount}**! Will you hit or stand?`)
      .addFields(
        { name: 'Your Hand', value: `${playerHand.map(card => `${cardEmojis[card]}`).join(' ')} (${playerValue})`, inline: true },
        { name: 'Dealer\'s Hand', value: `${cardEmojis[dealerHand[0]]} 🂠`, inline: true },
        { name: 'Dealer\'s Visible Value', value: dealerVisibleValue.toString(), inline: true }
      )
      .setColor('#00FF00');

    // Create hit and stand buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('hit')
          .setLabel('Hit')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('stand')
          .setLabel('Stand')
          .setStyle(ButtonStyle.Danger)
      );

    const gameMessage = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = gameMessage.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: 'This game is not for you!', ephemeral: true });
      }

      if (interaction.customId === 'hit') {
        playerHand.push(drawCard(deck));
        playerValue = calculateHandValue(playerHand);

        // If player busts (goes over 21)
        if (playerValue > 21) {
          embed.setDescription(`You busted! Dealer wins. You lost **${betAmount}**.`)
            .setFields(
              { name: 'Your Hand', value: `${playerHand.map(card => `${cardEmojis[card]}`).join(' ')} (${playerValue})`, inline: true },
              { name: 'Dealer\'s Hand', value: `${cardEmojis[dealerHand[0]]} ${cardEmojis[dealerHand[1]]}`, inline: true },
              { name: 'Dealer\'s Visible Value', value: dealerVisibleValue.toString(), inline: true }
            )
            .setColor('#FF0000');

          await interaction.update({ embeds: [embed], components: [] });
          collector.stop();
        } else {
          // Update player hand and continue
          embed.setFields(
            { name: 'Your Hand', value: `${playerHand.map(card => `${cardEmojis[card]}`).join(' ')} (${playerValue})`, inline: true },
            { name: 'Dealer\'s Hand', value: `${cardEmojis[dealerHand[0]]} 🂠`, inline: true },
            { name: 'Dealer\'s Visible Value', value: dealerVisibleValue.toString(), inline: true }
          );

          await interaction.update({ embeds: [embed] });
        }
      } else if (interaction.customId === 'stand') {
        // Dealer's turn: Dealer draws until they reach at least 17
        let dealerValue = calculateHandValue(dealerHand);
        while (dealerValue < 17) {
          dealerHand.push(drawCard(deck));
          dealerValue = calculateHandValue(dealerHand);
        }

        // Determine the outcome
        let result = '';
        let payout = 0;

        if (dealerValue > 21 || playerValue > dealerValue) {
          payout = betAmount * 2; // 1:1 payout for win
          userData.metadata.points += payout;
          result = `You win **${payout}**!`;
          embed.setColor('#00FF00');
        } else if (playerValue === dealerValue) {
          payout = betAmount; // Return original bet on tie
          userData.metadata.points += payout;
          result = 'It\'s a tie! You get your bet back.';
          embed.setColor('#FFFF00');
        } else {
          const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
          result = `Dealer wins! You lost **${betAmount}**.\n${randomRoast}`;
          embed.setColor('#FF0000');
        }

        await writeUserData(userId, userData);

        embed.setDescription(result)
          .setFields(
            { name: 'Your Hand', value: `${playerHand.map(card => `${cardEmojis[card]}`).join(' ')} (${playerValue})`, inline: true },
            { name: 'Dealer\'s Hand', value: `${dealerHand.map(card => `${cardEmojis[card]}`).join(' ')} (${dealerValue})`, inline: true }
          );

        await interaction.update({ embeds: [embed], components: [] });
        collector.stop();
      }
    });

    collector.on('end', async () => {
      // Remove buttons after game ends
      await gameMessage.edit({ components: [] });
    });
  }
};
