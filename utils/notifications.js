const { EmbedBuilder } = require('discord.js');

function sendUpdateMessageToAllGuilds(client, status, features = '') {
  const embed = new EmbedBuilder().setTitle('FeatherBot Update');
  if (status === 'maintenance') {
    embed.setDescription('FeatherBot is under maintenance. Commands and events are paused until further notice.').setColor('#FF0000');
  } else if (status === 'backup') {
    embed.setDescription('FeatherBot is back! Normal operations have resumed.').setColor('#00FF00');
  } else if (status === 'new_features') {
    embed.setDescription(`FeatherBot is back with new features!\n\n${features}`).setColor('#FFA500');
  }
  client.guilds.cache.forEach(guild => {
    const channel = guild.channels.cache.find(ch => ch.type === 0 && ch.permissionsFor(client.user).has('SendMessages'));
    if (channel) channel.send({ embeds: [embed] }).catch(error => console.error(`[${new Date().toISOString()}] Failed to send update to guild ${guild.id}:`, error));
  });
}

module.exports = { sendUpdateMessageToAllGuilds };