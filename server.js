const { Telegraf } = require("telegraf");
const express = require("express");
const sportshubCommand = require("./commands/sportshub");
const startCommand = require("./commands/start");
const streamedCommand = require("./commands/streamed");

// use dotenv to load environment variables
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();

// Initialize commands
sportshubCommand(bot);
startCommand(bot);
streamedCommand(bot);

// Start Express server
const PORT = process.env.PORT || 4000;

app.get("/", (req, res) => {
  res.send("Server is running on port " + PORT);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Start bot
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));