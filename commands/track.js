const { SlashCommandBuilder, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('track')
    .setDescription('Track progress for unlocking characters in Feather Family')
    .addIntegerOption(option =>
      option
        .setName('feather')
        .setDescription('Your current feather count from Feather Family')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(10000)
    ),
  async execute(interaction) {
    if (!interaction.guild) {
      const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64; // Fallback to numeric value 64 if undefined
      await interaction.reply({
        content: 'This command can only be used in a server.',
        flags: ephemeralFlag,
      });
      return;
    }

    const currentFeather = interaction.options.getInteger('feather');
    if (currentFeather === null || currentFeather < 0) {
      console.error(`[${new Date().toISOString()}] No valid feather count provided by ${interaction.user.tag}`);
      const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
      await interaction.reply({
        content: 'Please provide a valid feather count using /track feather:NUMBER (0-10,000).',
        flags: ephemeralFlag,
      });
      return;
    }

    console.log(`[${new Date().toISOString()}] Processing /track with feather count: ${currentFeather} for user ${interaction.user.tag}`);

    let characters = [];
    const charactersPath = path.join(__dirname, '..', 'feather-family-data', 'characters.json');
    try {
      if (!fs.existsSync(charactersPath)) throw new Error('characters.json file does not exist');
      characters = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));
      if (!Array.isArray(characters) || characters.length === 0) throw new Error('Characters array is empty or invalid');
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load characters.json:`, error);
      const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
      await interaction.reply({
        content: 'Error loading character data. Please try again later.',
        flags: ephemeralFlag,
      });
      return;
    }

    const trackableCharacters = characters.filter(c =>
      (c.category === 'Unlockable' && c.cost !== undefined && c.cost > 0) ||
      (c.category === 'Standard' && c.cost > 0)
    );
    if (trackableCharacters.length === 0) {
      console.error(`[${new Date().toISOString()}] No trackable characters found for ${interaction.user.tag}`);
      const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
      await interaction.reply({
        content: 'No characters available to track. Standard characters with 0 cost are free, and Game Pass characters require Robux. Use /character list to see all characters.',
        flags: ephemeralFlag,
      });
      return;
    }

    const options = trackableCharacters.map(character => ({
      label: character.name,
      value: character.name,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_character_${interaction.user.id}_${currentFeather}`)
      .setPlaceholder('Select a character...')
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = new EmbedBuilder()
      .setColor('#00AAFF')
      .setTitle('Track Your Progress <:Feather:1376815829898887268>')
      .setDescription(`You have entered **${currentFeather.toLocaleString()}** feathers. Select a character to see your progress. (This is your input; earn 5 feathers every 90 seconds in Feather Family.) <:Feather:1376815829898887268>`)
      .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });

    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: ephemeralFlag,
    });
  },
};