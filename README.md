# FeatherBot

FeatherBot is a Discord bot for *Feather Family* trivia, offering random questions, congratulatory messages for correct answers, and customizable settings. Built with Node.js and hosted on Bot-Hosting.net.

## Features
- Posts random trivia questions, avoiding repeats until all are used.
- Congratulates users with a custom embed and message on correct answers.
- Configurable via `/settriviachannel` (channel, frequency, answer time).
- Includes images and hints for some questions.
- Sends "It's almost time!" alerts 30 seconds before the answer window ends.

## Prerequisites
- Node.js (v18+ compatible with Node v22 Docker)
- Discord bot token and application ID
- GitHub repo with access token
- Bot-Hosting.net account

## Installation

1. Install Dependencies
   ```bash
   npm install

2. Set Environment Variables
Create a .env file in the project root:
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id
WEBHOOK_JOIN_URL=your_join_webhook_url (optional)
WEBHOOK_LEAVE_URL=your_leave_webhook_url (optional)

3. Clone the Repo
git clone https://github.com/yourusername/FeatherBot.git
cd FeatherBot

4. Update Trivia Questions
Edit trivia-questions.json. Example:
[
  {
    "question": "What is the first bird in Feather Family?",
    "answer": "Chicken"
  },
  {
    "question": "What bird has a vibrant tail?",
    "answer": "Peafowl",
    "image": "https://example.com/image.png",
    "hint": "Known for colorful tail displays."
  }
]

