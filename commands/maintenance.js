const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const { sendUpdateMessageToAllGuilds } = require('../utils/notifications');
const autoTrivia = require('../utils/autotrivia');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Toggle maintenance mode (Developer only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    const developerRoleId = '1376907745571111013';
    const allowedUserId = '1045400374313484419';
    if (interaction.user.id !== allowedUserId && !interaction.member.roles.cache.has(developerRoleId)) {
      await interaction.reply({
        content: 'Only developers with the Developer role or the authorized user can use this command.',
        flags: ephemeralFlag,
      });
      return;
    }

    const { client } = interaction;
    client.isMaintenance = !client.isMaintenance;
    console.log(`[${new Date().toISOString()}] Maintenance mode set to: ${client.isMaintenance}`);

    if (client.isMaintenance) {
      autoTrivia.startAutoTrivia(client);
    } else {
      autoTrivia.startAutoTrivia(client);
    }

    sendUpdateMessageToAllGuilds(client, client.isMaintenance ? 'maintenance' : 'backup');

    await interaction.reply({
      content: `Maintenance mode is now ${client.isMaintenance ? 'on' : 'off'}.`,
      flags: ephemeralFlag,
    });
  },
};