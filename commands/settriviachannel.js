const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settriviachannel')
    .setDescription('Set the channel for auto-trivia (Admin/Moderator only)')
    .addChannelOption(option =>
      option.setName('channel').setDescription('The channel to send trivia questions to').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration').setDescription('How often to send trivia questions (in minutes)').setRequired(true).setMinValue(1).setMaxValue(300)
    )
    .addIntegerOption(option =>
      option
        .setName('answer_time_limit')
        .setDescription('How long users have to answer each trivia question (in minutes)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(30)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator | PermissionFlagsBits.ManageChannels | PermissionFlagsBits.ModerateMembers),
  async execute(interaction) {
    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    const channel = interaction.options.getChannel('channel');
    const duration = interaction.options.getInteger('duration');
    const answerTimeLimit = interaction.options.getInteger('answer_time_limit');
    if (!channel.isTextBased()) {
      await interaction.reply({ content: 'Please select a text-based channel.', flags: ephemeralFlag });
      return;
    }
    const settingsPath = path.join(__dirname, '..', 'triviaSettings.json');
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to load triviaSettings.json:`, error);
      }
    }
    settings[interaction.guild.id] = { channelId: channel.id, duration, answerTimeLimit };
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      await interaction.reply({
        content: `Trivia channel set to ${channel.toString()} with questions every ${duration} minutes. Users have ${answerTimeLimit} minute(s) to answer each question.`,
        flags: ephemeralFlag,
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to write to triviaSettings.json:`, error);
      await interaction.reply({ content: 'Error saving trivia settings.', flags: ephemeralFlag });
    }
  },
};