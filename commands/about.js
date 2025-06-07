const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Learn more about FeatherBot'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle('About FeatherBot <:Feather:1376815829898887268>')
      .setDescription('FeatherBot is a Discord bot designed to enhance your Feather Family experience! Track your progress, enjoy trivia, and more.')
      .addFields(
        { name: 'Developer', value: 'Timtech', inline: true },
        { name: 'Version', value: '1.0.0', inline: true }
      )
      .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });

    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    await interaction.reply({
      embeds: [embed],
      flags: ephemeralFlag,
    });
  },
};