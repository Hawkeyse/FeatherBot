const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('contact')
    .setDescription('Get contact information for FeatherBot support'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#FF4500')
      .setTitle('Contact FeatherBot Support <:Feather:1376815829898887268>')
      .setDescription('Need help? Reach out to us!')
      .addFields(
        { name: 'Support Server', value: '[Join Here](https://discord.gg/vGpWFzFpQP)', inline: true },
        { name: 'Developer', value: '@Timtech', inline: true }
      )
      .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });

    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    await interaction.reply({
      embeds: [embed],
      flags: ephemeralFlag,
    });
  },
};