const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const { sendUpdateMessageToAllGuilds } = require('../utils/notifications');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('update')
    .setDescription('Send an update notification to all servers (Developer only)')
    .addStringOption(option =>
      option.setName('status').setDescription('The status of the update (maintenance, backup, or new_features)').setRequired(true)
        .addChoices(
          { name: 'Maintenance', value: 'maintenance' },
          { name: 'Backup', value: 'backup' },
          { name: 'New Features', value: 'new_features' }
        )
    )
    .addStringOption(option => option.setName('features').setDescription('Optional features or details for new_features status').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    const developerRoleId = '1376907745571111013';
    const allowedUserId = '1045400374313484419';
    if (interaction.user.id !== allowedUserId && !interaction.member.roles.cache.has(developerRoleId)) {
      await interaction.reply({ content: 'Only developers with the Developer role or the authorized user can use this command.', flags: ephemeralFlag });
      return;
    }
    const status = interaction.options.getString('status');
    const features = interaction.options.getString('features') || '';
    console.log(`[${new Date().toISOString()}] Sending update notification with status: ${status} and features: ${features}`);
    sendUpdateMessageToAllGuilds(interaction.client, status, features);
    await interaction.reply({ content: `Update notification sent with status: ${status}${features ? ` and features: ${features}` : ''}.`, flags: ephemeralFlag });
  },
};