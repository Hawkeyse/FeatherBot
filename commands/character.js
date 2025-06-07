const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription('Manage characters in Feather Family')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all characters')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new character (Developer only)')
        .addStringOption(option => option.setName('name').setDescription('Name of the character').setRequired(true))
        .addStringOption(option =>
          option.setName('category').setDescription('Category of the character').setRequired(true)
            .addChoices(
              { name: 'Standard', value: 'Standard' },
              { name: 'Unlockable', value: 'Unlockable' },
              { name: 'Game Pass', value: 'Game Pass' }
            )
        )
        .addIntegerOption(option => option.setName('cost').setDescription('Feather cost (for Unlockable)').setRequired(false).setMinValue(0))
        .addIntegerOption(option => option.setName('robux').setDescription('Robux price (for Game Pass)').setRequired(false).setMinValue(0))
        .addStringOption(option => option.setName('image').setDescription('Image URL for the character').setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a character (Developer only)')
        .addStringOption(option => option.setName('name').setDescription('Name of the character to remove').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    const subcommand = interaction.options.getSubcommand();
    const charactersPath = path.join(__dirname, '..', 'feather-family-data', 'characters.json');
    let characters = [];
    try {
      characters = JSON.parse(fs.readFileSync(charactersPath, 'utf8'));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load characters.json:`, error);
      await interaction.reply({ content: 'Error loading character data.', flags: ephemeralFlag });
      return;
    }
    if (subcommand === 'list') {
      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('Feather Family Characters <:Feather:1376815829898887268>')
        .setDescription(characters.map(c => `**${c.name}** (${c.category})${c.cost ? ` - ${c.cost} Feathers` : c.robux ? ` - ${c.robux} Robux` : ''}`).join('\n'))
        .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });
      await interaction.reply({ embeds: [embed], flags: ephemeralFlag });
    } else if (subcommand === 'add') {
      const developerRoleId = '1376907745571111013';
      const allowedUserId = '1045400374313484419';
      if (interaction.user.id !== allowedUserId && !interaction.member.roles.cache.has(developerRoleId)) {
        await interaction.reply({ content: 'Only developers with the Developer role or the authorized user can use this command.', flags: ephemeralFlag });
        return;
      }
      const name = interaction.options.getString('name');
      const category = interaction.options.getString('category');
      const cost = interaction.options.getInteger('cost');
      const robux = interaction.options.getInteger('robux');
      const image = interaction.options.getString('image') || null;

      if (category === 'Unlockable' && (cost === null || cost < 0)) {
        await interaction.reply({ content: 'Unlockable characters require a valid feather cost (minimum 0).', flags: ephemeralFlag });
        return;
      } else if (category === 'Game Pass' && (robux === null || robux < 0)) {
        await interaction.reply({ content: 'Game Pass characters require a valid robux price (minimum 0).', flags: ephemeralFlag });
        return;
      } else if (category !== 'Game Pass' && robux !== null) {
        await interaction.reply({ content: 'Only Game Pass characters can have a robux price.', flags: ephemeralFlag });
        return;
      } else if (category !== 'Unlockable' && cost !== null && cost > 0) {
        await interaction.reply({ content: 'Only Unlockable characters can have a feather cost.', flags: ephemeralFlag });
        return;
      }

      if (image) {
        try {
          new URL(image);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Invalid image URL provided: ${image}`);
          await interaction.reply({ content: 'Invalid image URL provided.', flags: ephemeralFlag });
          return;
        }
      }

      characters.push({ name, category, cost: category === 'Unlockable' ? cost : null, robux: category === 'Game Pass' ? robux : null, image });
      try {
        fs.writeFileSync(charactersPath, JSON.stringify(characters, null, 2));
        await interaction.reply({ content: `Added character: ${name} (${category}).`, flags: ephemeralFlag });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to write to characters.json:`, error);
        await interaction.reply({ content: 'Error saving character data.', flags: ephemeralFlag });
      }
    } else if (subcommand === 'remove') {
      const developerRoleId = '1376907745571111013';
      const allowedUserId = '1045400374313484419';
      if (interaction.user.id !== allowedUserId && !interaction.member.roles.cache.has(developerRoleId)) {
        await interaction.reply({ content: 'Only developers with the Developer role or the authorized user can use this command.', flags: ephemeralFlag });
        return;
      }
      const name = interaction.options.getString('name');
      const index = characters.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
      if (index === -1) {
        await interaction.reply({ content: `Character ${name} not found.`, flags: ephemeralFlag });
        return;
      }
      characters.splice(index, 1);
      try {
        fs.writeFileSync(charactersPath, JSON.stringify(characters, null, 2));
        await interaction.reply({ content: `Removed character: ${name}.`, flags: ephemeralFlag });
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to write to characters.json:`, error);
        await interaction.reply({ content: 'Error removing character.', flags: ephemeralFlag });
      }
    }
  },
};