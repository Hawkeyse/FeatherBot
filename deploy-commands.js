const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
    console.log(`[${new Date().toISOString()}] Loaded command for deployment: ${command.data.name}`);
  } else {
    console.error(`[${new Date().toISOString()}] The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register commands globally
(async () => {
  try {
    console.log(`[${new Date().toISOString()}] Started refreshing ${commands.length} application (/) commands globally.`);

    // Register commands globally by omitting the guild ID
    const data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );

    console.log(`[${new Date().toISOString()}] Successfully reloaded ${data.length} application (/) commands globally.`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error deploying commands:`, error);
  }
})();