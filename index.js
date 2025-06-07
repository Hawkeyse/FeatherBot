const { Client, GatewayIntentBits, Collection, EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const autoTrivia = require('./utils/autotrivia');
const { sendUpdateMessageToAllGuilds } = require('./utils/notifications');
const fetch = require('node-fetch');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.commands = new Collection();
client.isMaintenance = false;
let charactersCache = null;

function reloadCharactersCache() {
  try {
    charactersCache = JSON.parse(fs.readFileSync(path.join(__dirname, 'feather-family-data', 'characters.json'), 'utf8'));
    if (!Array.isArray(charactersCache) || charactersCache.length === 0) throw new Error('Characters array is empty or invalid');
    console.log(`[${new Date().toISOString()}] Successfully reloaded ${charactersCache.length} characters.`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to reload characters.json:`, error);
    return false;
  }
}

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  try {
    const filePath = path.join(commandsPath, file);
    delete require.cache[require.resolve(filePath)];
    const command = require(filePath);
    if ('data' in command && 'execute' in command && command.data.name) {
      if (!client.commands.has(command.data.name)) {
        client.commands.set(command.data.name, command);
        console.log(`[${new Date().toISOString()}] Loaded command: ${command.data.name}`);
      } else {
        console.warn(`[${new Date().toISOString()}] Duplicate command name detected: ${command.data.name} from ${file}, skipping.`);
      }
    } else {
      console.error(`[${new Date().toISOString()}] The command at ${filePath} is missing a required "data" or "execute" property or data.name is invalid.`);
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to load command from ${file}:`, error);
  }
}

const webhookJoinUrl = process.env.WEBHOOK_JOIN_URL;
const webhookLeaveUrl = process.env.WEBHOOK_LEAVE_URL;

async function sendWebhookEmbed(guildName, guildId, message) {
  const webhookUrl = message.includes('joined') ? webhookJoinUrl : webhookLeaveUrl;
  if (!webhookUrl) {
    console.error(`[${new Date().toISOString()}] ${message.includes('joined') ? 'WEBHOOK_JOIN_URL' : 'WEBHOOK_LEAVE_URL'} is not set in .env`);
    return;
  }
  const embed = new EmbedBuilder()
    .setColor('#FF4500')
    .setTitle(message.includes('joined') ? '<:Feather:1376815829898887268> Bot Joined!' : '<:Feather:1376815829898887268> Bot Left')
    .setDescription(message.includes('joined') ? `🔥 FeatherBot has joined **${guildName}**!` : `🔥 FeatherBot has left **${guildName}**.`)
    .addFields({ name: 'Server ID', value: guildId, inline: true }, { name: 'Server Name', value: guildName, inline: true })
    .setFooter({ text: 'FeatherBot | Not affiliated with Feather Family' });
  try {
    const response = await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ embeds: [embed.toJSON()] }) });
    if (!response.ok) console.error(`[${new Date().toISOString()}] Webhook failed: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending webhook:`, error);
  }
}

client.once('ready', async () => {
  console.log(`[${new Date().toISOString()}] Logged in as ${client.user.tag}`);
  if (!reloadCharactersCache()) {
    console.error(`[${new Date().toISOString()}] Failed to initialize characters cache. Exiting.`);
    process.exit(1);
  }
  autoTrivia.startAutoTrivia(client);
});

client.on('guildCreate', async (guild) => {
  const guildName = guild.name || 'Unknown Server';
  const guildId = guild.id;
  await sendWebhookEmbed(guildName, guildId, 'FeatherBot has joined');
});

client.on('guildDelete', async (guild) => {
  const guildName = guild.name || 'Unknown Server';
  const guildId = guild.id;
  autoTrivia.stopAutoTrivia(guildId); // Stop trivia when leaving a guild
  await sendWebhookEmbed(guildName, guildId, 'FeatherBot has left the server');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const guildId = message.guildId;
  const settingsPath = path.join(__dirname, 'triviaSettings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load triviaSettings.json:`, error);
      return;
    }
  }

  const config = settings[guildId];
  if (!config) return;

  const triviaChannelId = config.channelId;
  if (message.channelId !== triviaChannelId) return;

  const active = autoTrivia.activeTrivia.get(guildId);
  if (!active) return;

  const userAnswer = message.content.trim().toLowerCase();
  const correctAnswer = active.answer.toLowerCase();

  if (userAnswer === correctAnswer) {
    const winEmbed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('Correct Answer! <:Feather:1376815829898887268>')
      .setDescription(`${message.author.toString()} got it right! The answer was **${correctAnswer}**. Well done!`)
      .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });
    await active.message.edit({ embeds: [winEmbed] });
    await message.reply(`Congratulations, ${message.author.toString()}! You nailed it! 🎉`);
    autoTrivia.activeTrivia.delete(guildId);
  } else {
    await message.reply('Incorrect! Try again.');
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isChatInputCommand()) {
    const guildName = interaction.guild ? interaction.guild.name : 'DM';
    const guildId = interaction.guild ? interaction.guild.id : 'N/A';
    console.log(`[${new Date().toISOString()}] Command ${interaction.commandName} executed in server: ${guildName} (ID: ${guildId}) by user ${interaction.user.tag}`);

    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    if (client.isMaintenance && interaction.commandName !== 'maintenance') {
      await interaction.reply({ content: 'The bot is currently under maintenance. Please try again later.', flags: ephemeralFlag });
      return;
    }
    if (interaction.commandName === 'maintenance') {
      const developerUserId = '1045400374313484419'; // Keep this for maintenance command only
      if (interaction.user.id !== developerUserId && !(interaction.member.permissions.has(PermissionFlagsBits.Administrator))) {
        await interaction.reply({
          content: 'Only bot developers or server administrators can use this command.',
          flags: ephemeralFlag,
        });
        return;
      }
      client.isMaintenance = !client.isMaintenance;
      console.log(`[${new Date().toISOString()}] Maintenance mode set to: ${client.isMaintenance}`);
      if (client.isMaintenance) {
        for (const guild of client.guilds.cache.values()) {
          autoTrivia.stopAutoTrivia(guild.id);
        }
      } else {
        autoTrivia.startAutoTrivia(client);
      }
      await interaction.reply({
        content: `Maintenance mode is now ${client.isMaintenance ? 'on' : 'off'}.`,
        flags: ephemeralFlag,
      });
      return;
    }
    const command = client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`[${new Date().toISOString()}] No command matching ${interaction.commandName} was found in server: ${guildName} (ID: ${guildId}).`);
      return;
    }
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error executing ${interaction.commandName} in server: ${guildName} (ID: ${guildId}):`, error);
      await interaction.reply({ content: 'There was an error while executing this command!', flags: ephemeralFlag }).catch(console.error);
    }
  } else if (interaction.isStringSelectMenu()) {
    const guildName = interaction.guild ? interaction.guild.name : 'DM';
    const guildId = interaction.guild ? interaction.guild.id : 'N/A';
    console.log(`[${new Date().toISOString()}] Select menu interaction ${interaction.customId} executed in server: ${guildName} (ID: ${guildId}) by user ${interaction.user.tag}`);

    const ephemeralFlag = InteractionResponseFlags ? InteractionResponseFlags.Ephemeral : 64;
    if (client.isMaintenance) {
      await interaction.reply({ content: 'The bot is currently under maintenance. Please try again later.', flags: ephemeralFlag });
      return;
    }
    if (interaction.customId.startsWith('select_character_')) {
      console.log(`[${new Date().toISOString()}] Received interaction with customId: ${interaction.customId}`);
      const parts = interaction.customId.split('_');
      const userId = parts[1];
      const featherCountStr = parts[parts.length - 1];
      const selectedCharacter = interaction.values[0];
      const characters = reloadCharactersCache() ? charactersCache : [];
      const character = characters.find(c => c.name === selectedCharacter);

      if (!character || !character.cost) {
        await interaction.reply({ content: 'Invalid character selected or no cost data available.', flags: ephemeralFlag });
        return;
      }

      const yourInputFeathers = parseInt(featherCountStr, 10);
      if (isNaN(yourInputFeathers) || yourInputFeathers < 0 || yourInputFeathers > 10000) {
        console.error(`[${new Date().toISOString()}] Invalid featherCount from customId: ${featherCountStr}`);
        await interaction.reply({ content: 'Invalid feather count detected. Please use /track with a feather count between 0 and 10,000.', flags: ephemeralFlag });
        return;
      }

      const feathersNeeded = character.cost;
      const feathersToGrind = Math.max(0, feathersNeeded - yourInputFeathers);
      const grindMinutes = feathersToGrind > 0 ? Math.ceil(feathersToGrind / (5 / 1.5)) : 0;

      const embed = new EmbedBuilder()
        .setColor('#FF4500')
        .setTitle(`Progress for ${selectedCharacter} <:Feather:1376815829898887268>`)
        .setDescription(
          `**Category:** ${character.category}\n` +
          `**Cost:** ${feathersNeeded.toLocaleString()} Feathers\n` +
          `**Your Input Feathers:** ${yourInputFeathers.toLocaleString()}\n` +
          `**Feathers to Grind:** ${feathersToGrind.toLocaleString()}\n` +
          (feathersToGrind > 0 ? `**Grind Effort:** ~${grindMinutes} minutes (5 feathers per 90 seconds)\n` : 'Unlocked!\n')
        )
        .setThumbnail(character.image || 'https://via.placeholder.com/150')
        .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family', iconURL: 'https://via.placeholder.com/32' });

      await interaction.update({ embeds: [embed], components: [] });
    }
  }
});

process.on('unhandledRejection', error => {
  console.error(`[${new Date().toISOString()}] Unhandled promise rejection:`, error);
});

client.login(process.env.DISCORD_TOKEN);