const { ActionRowBuilder, SelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const bugReportsPath = path.join(__dirname, '..', 'bugReports.json');
const adminUserId = '306872598057189378'; // Your Discord ID

module.exports = {
  name: 'reportbug',
  description: 'Report a bug or issue with the bot.',
  async execute(message, args) {
    if (args.length === 0) {
      return message.channel.send('❗ **Please provide a description of the bug.**');
    }

    const bugDescription = args.join(' ');

    const selectMenu = new SelectMenuBuilder()
      .setCustomId('bug_category')
      .setPlaceholder('🔍 Select Bug Category')
      .addOptions([
        { label: '🐛 UI Issue', value: 'ui_issue' },
        { label: '⚙️ Command Error', value: 'command_error' },
        { label: '🐢 Performance', value: 'performance' },
        { label: '❓ Other', value: 'other' },
      ]);

    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_bug_report')
      .setLabel('✅ Confirm')
      .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_bug_report')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Danger);

    const row1 = new ActionRowBuilder().addComponents(selectMenu);
    const row2 = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const embed = new EmbedBuilder()
      .setTitle('🐞 Report a Bug')
      .setDescription('Please select the category of the bug and confirm your report.')
      .setColor('#ff4757')
      .addFields(
        { name: '📝 Bug Description', value: bugDescription },
        { name: '📊 Status', value: 'Pending Confirmation' }
      )
      .setThumbnail('https://i.imgur.com/OuA6XXG.png') // Example image, you can replace it with another URL
      .setFooter({ text: 'Thank you for helping us improve the bot!' })
      .setTimestamp();

    const filter = (interaction) => interaction.user.id === message.author.id;

    const sentMessage = await message.channel.send({ embeds: [embed], components: [row1, row2] });

    const collector = sentMessage.createMessageComponentCollector({ filter, time: 60000 });

    let selectedCategory = 'other'; // Default category

    collector.on('collect', async (interaction) => {
      if (interaction.isSelectMenu()) {
        selectedCategory = interaction.values[0];
        await interaction.reply({ content: `🔍 **Category selected:** ${selectedCategory}`, ephemeral: true });
      }

      if (interaction.isButton()) {
        if (interaction.customId === 'confirm_bug_report') {
          const bugReport = {
            user: message.author.tag,
            userId: message.author.id,
            report: bugDescription,
            category: selectedCategory,
            timestamp: new Date().toISOString(),
          };

          let bugReports = [];
          if (fs.existsSync(bugReportsPath)) {
            bugReports = JSON.parse(fs.readFileSync(bugReportsPath, 'utf8'));
          }

          bugReports.push(bugReport);

          fs.writeFileSync(bugReportsPath, JSON.stringify(bugReports, null, 2));

          // Send the bug report to the admin's DMs
          const adminUser = await message.client.users.fetch(adminUserId);
          const dmEmbed = new EmbedBuilder()
            .setTitle('🚨 New Bug Report')
            .setColor('#ff4757')
            .addFields(
              { name: 'Reported By', value: message.author.tag, inline: true },
              { name: 'Category', value: selectedCategory, inline: true },
              { name: 'Description', value: bugDescription, inline: false }
            )
            .setThumbnail('https://i.imgur.com/OuA6XXG.png') // Same or different image
            .setTimestamp();

          adminUser.send({ embeds: [dmEmbed] });

          await interaction.update({
            content: '✅ **Thank you! Your bug report has been submitted.**',
            components: [],
            embeds: []
          });
        } else if (interaction.customId === 'cancel_bug_report') {
          await interaction.update({
            content: '❌ **Bug report canceled.**',
            components: [],
            embeds: []
          });
        }
      }
    });

    collector.on('end', async () => {
      if (!sentMessage.deleted) {
        await sentMessage.edit({ components: [] });
      }
    });
  },
};
