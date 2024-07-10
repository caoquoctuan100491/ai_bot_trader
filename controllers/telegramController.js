//=========================================================
//Bot telegram
//=========================================================
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const userController = require("../controllers/userController");
const exchangeController = require("../controllers/exchange");

// replace the value below with the Telegram token you receive from @BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/note (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/setExchange (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const exchangeName = match[1];
  exchangeController.BotTrader().setExchange(chatId, bot, exchangeName);
  // bot.sendMessage(chatId, resp);
});

bot.onText(/\/getBalance (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];

  bot.sendMessage(chatId, resp);
});

bot.onText(/\/setApi (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  let req = resp.split(" ");
  let api = {
    exchange: req[0],
    apiKey: req[1],
    secretKey: req[2],
    displayName: req[3],
    status: req[4],
  };
  exchangeController.API().add(chatId, api);
  bot.sendMessage(chatId, resp);
});

bot.onText(/\/startBot (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  let req = resp.split(" ");
  let data = {
    symbol: req[0],
    displayName: req[1],
    investment: parseFloat(req[2]),
  };
  exchangeController.BotTrader().start(chatId, bot, data);
});

bot.onText(/\/botStatus (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  let req = resp.split(" ");
  let data = {
    symbol: req[0],
    displayName: req[1],
  };
  exchangeController.BotTrader().botStatus(chatId, bot, data);
});

bot.onText(/\/checkExchange (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1];
  let res = exchangeController.Utils().checkExchange(resp);
  bot.sendMessage(chatId, res);
});

bot.onText(/\/followSRI (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match[1]; // the captured "whatever"
  let req = resp.split(" ");
  let data = {
    symbol: req[0],
    candle: req[1],
    period: parseInt(req[2]),
    rsi_sell: parseInt(req[3]),
    rsi_buy: parseInt(req[4]),
    intervalTime: req[5],
  };
  exchangeController.BotTrader().setFollowRSI(chatId, bot, data);
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  let res;
  switch (msg.text) {
    case "/start":
      res = await userController.login(chatId);
      let message = notes(chatId);
      res.message += "\n" + message;
      break;
    case "/getSymbols":
      break;
    case "/notes":
      res = notes(chatId);
      break;
    case "/getApis":
      exchangeController.API().getApis(chatId, bot);
      break;
  }
  if (res) {
    bot.sendMessage(chatId, res.message);
  }
});

const notes = (chatId) => {
  let message = "Notes: \n";
  message += "/notes to get list note\n";
  message += "/setExchange exchange\n";
  message += "/followSRI symbol timeFrame intervalTime period top bottom\n";
  message += "/unfollow symbol\n";
  message += "/getApis\n";
  message += "/setApi exchange apiKey secretKey displayName status\n";
  message += "/getBalance\n";
  message += "/checkExchange exchange\n";
  message += "/startBot symbol displayName invest  --Note: If only for follow use /startBot symbol \n";
  return message;
};
