const { Telegraf } = require("telegraf");
const express = require("express");
const sportshubCommand = require("./commands/sportshub");
const startCommand = require("./commands/start");

const bot = new Telegraf("5368324838:AAElItK4xFs8WdUJX6FBD0qMpx7aXyao3tE");
const app = express();

// Initialize commands
sportshubCommand(bot);
startCommand(bot);

// Start Express server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start bot
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));