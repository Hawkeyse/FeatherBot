const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Load trivia questions from trivia-questions.json
let triviaQuestions = [];
const triviaQuestionsPath = path.join(__dirname, '..', 'trivia-questions.json');
try {
  triviaQuestions = JSON.parse(fs.readFileSync(triviaQuestionsPath, 'utf8'));
  if (!Array.isArray(triviaQuestions) || triviaQuestions.length === 0) {
    throw new Error('Trivia questions array is empty or invalid');
  }
  console.log(`[${new Date().toISOString()}] Loaded ${triviaQuestions.length} trivia questions.`);
} catch (error) {
  console.error(`[${new Date().toISOString()}] Failed to load trivia-questions.json:`, error);
  triviaQuestions = [];
}

let activeTrivia = new Map(); // Track active trivia questions per guild

function startAutoTrivia(client) {
  if (triviaQuestions.length === 0) {
    console.error(`[${new Date().toISOString()}] No trivia questions available. Auto-trivia will not start.`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting auto-trivia system...`);

  // Initial check for all guilds
  checkAndSendTrivia(client);

  // Set interval to check and send trivia based on each guild's duration
  setInterval(() => checkAndSendTrivia(client), 60000); // Check every minute to see if duration has elapsed
}

async function checkAndSendTrivia(client) {
  const settingsPath = path.join(__dirname, '..', 'triviaSettings.json');
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load triviaSettings.json:`, error);
      return;
    }
  }

  for (const [guildId, config] of Object.entries(settings)) {
    const lastTriviaTime = activeTrivia.get(guildId)?.lastSent || 0;
    const currentTime = Date.now();
    const durationMs = (config.duration || 10) * 60 * 1000; // Convert minutes to milliseconds, default to 10 if undefined

    // Only send new trivia if the duration has passed since the last one
    if (!activeTrivia.has(guildId) || (currentTime - lastTriviaTime >= durationMs)) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        console.log(`[${new Date().toISOString()}] Guild ${guildId} not found.`);
        continue;
      }

      const channel = guild.channels.cache.get(config.channelId);
      if (!channel || !channel.isTextBased()) {
        console.log(`[${new Date().toISOString()}] Trivia channel ${config.channelId} not found or not text-based in guild ${guildId}.`);
        continue;
      }

      // Use a default answerTimeLimit of 5 minutes if not specified
      const answerTimeLimit = config.answerTimeLimit || 5;

      // Track used question indices for this guild
      let usedIndices = activeTrivia.get(guildId)?.usedIndices || new Set();
      let availableIndices = Array.from({ length: triviaQuestions.length }, (_, i) => i).filter(i => !usedIndices.has(i));

      // If all questions are used, reset the set
      if (availableIndices.length === 0) {
        usedIndices.clear();
        availableIndices = Array.from({ length: triviaQuestions.length }, (_, i) => i);
      }

      // Select a random unused question
      const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
      const trivia = triviaQuestions[randomIndex];
      usedIndices.add(randomIndex);

      const embed = new EmbedBuilder()
        .setColor('#00AAFF')
        .setTitle('Trivia Time! <:Feather:1376815829898887268>')
        .setDescription(
          `**Question:** ${trivia.question}\n` +
          (trivia.hint ? `**Hint:** ${trivia.hint}\n` : '') +
          `You have ${answerTimeLimit} minute(s) to answer! Type your answer in the chat.`
        )
        .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });

      if (trivia.image) {
        embed.setImage(trivia.image);
      }

      try {
        const message = await channel.send({ embeds: [embed] });
        activeTrivia.set(guildId, { message, answer: trivia.answer, lastSent: currentTime, usedIndices });

        // Send "It's almost time!" notification 30 seconds before the end
        const warningTime = (answerTimeLimit * 60 - 30) * 1000; // 30 seconds before end
        if (warningTime > 0) {
          setTimeout(async () => {
            if (!activeTrivia.has(guildId)) return; // Skip if trivia ended early
            await channel.send('It\'s almost time! Hurry up and submit your answer!');
          }, warningTime);
        }

        // End trivia after answerTimeLimit
        setTimeout(async () => {
          if (!activeTrivia.has(guildId)) return; // Skip if trivia ended early
          const { message: triviaMessage, answer } = activeTrivia.get(guildId);
          const endEmbed = new EmbedBuilder()
            .setColor('#FF4500')
            .setTitle('Trivia Ended! <:Feather:1376815829898887268>')
            .setDescription(`Time's up! The correct answer was: **${answer}**.`)
            .setFooter({ text: 'Powered by FeatherBot | Not affiliated with Feather Family' });
          if (trivia.image) {
            endEmbed.setImage(trivia.image);
          }
          await triviaMessage.edit({ embeds: [endEmbed] });
          activeTrivia.delete(guildId);
        }, answerTimeLimit * 60 * 1000); // Convert minutes to milliseconds
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending trivia in guild ${guildId}:`, error);
        activeTrivia.delete(guildId);
      }
    }
  }
}

function stopAutoTrivia(guildId) {
  if (activeTrivia.has(guildId)) {
    activeTrivia.delete(guildId);
    console.log(`[${new Date().toISOString()}] Stopped active trivia in guild ${guildId}.`);
  }
}

// Export activeTrivia for use in index.js
module.exports = { startAutoTrivia, stopAutoTrivia, activeTrivia };