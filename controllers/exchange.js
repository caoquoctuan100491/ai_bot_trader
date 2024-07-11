const ccxtPro = require("ccxt").pro;
const RSI = require("technicalindicators").RSI;
const Api = require("../models/Exchange_API");
const AI = require("../models/AI");
const Order = require("../models/Order");
const WebSocket = require("ws");
const User = require("../models/User");
let arrInterval = [];

const BotTrader = () => {
  const start = async (chatId, bot, data) => {
    let intervalTime = 1000;
    let user = await User.findOne({ chatId: chatId });
    if (user.exchange === undefined) {
      bot.sendMessage(chatId, "Please set exchange first with /setExchange <exchange>");
      return;
    }

    data.intervalId = chatId + user.exchange + data.symbol;
    removeInterval(chatId, user.exchange, data.symbol);
    data.chatId = chatId;

    data.interval = setInterval(async () => {
      let user = await User.findOne({ chatId: chatId });
      let exchange = new ccxtPro[user.exchange]();
      let ai = await getAI(chatId, { displayName: data.displayName, symbol: data.symbol });
      intervalTime = Utils().convertTime(data.intervalTime);
      let ohlcv = await exchange.watchOHLCV(data.symbol, data.candle);
      const ticker = await exchange.watchTicker(data.symbol);
      const lastPrice = ticker.last;
      switch (ai.status) {
        case "followRSI":
          if (ai.period == undefined || ai.rsi_sell == undefined || ai.rsi_buy == undefined) {
            let message =
              "You are missing one of the following fields:  period, rsi_sell, rsi_buy. Please set RSI again with\n /followRSI <symbol> <candle> <period> <rsi_sell> <rsi_buy> <intervalTime> \n";
            message += "Example: /followRSI BTC/USDT 1h 14 70 30 1m \n";
            bot.sendMessage(chatId, message);
            ai.status = "idle";
            await ai.save();
            return;
          }
          let rsi = await getRSI(ohlcv, ai.period);
          let currentRSI = rsi.nextValue(lastPrice);
          if (currentRSI > ai.rsi_sell) {
            bot.sendMessage(chatId, "RSI is over sell: " + currentRSI);
          } else if (currentRSI < ai.rsi_buy) {
            bot.sendMessage(chatId, "RSI is over buy: " + currentRSI);
          } else {
            bot.sendMessage(chatId, "RSI is normal: " + currentRSI);
          }
          break;
        case "running":
          createOrer(data, rsi, lastPrice, exchange, ai);
          break;
        case "pause":
          pause(chatId, bot, data);
          break;
        case "stop":
          stop(chatId, bot, data);
          break;
        default:
          break;
      }
    }, intervalTime);
    arrInterval.push(data);
  };

  const removeInterval = (chatId, exchange, symbol) => {
    intervalId = chatId + exchange + symbol;
    for (let i = 0; i < arrInterval.length; i++) {
      if (arrInterval[i].intervalId == intervalId) {
        clearInterval(arrInterval[i].interval);
        arrInterval.splice(i, 1);
      }
    }
  };

  const setExchange = async (chatId, bot, exchangeName) => {
    let user = await User.findOne({
      chatId: chatId,
    });
    if (!user.exchange) {
      console.log(exchangeName);
      let exchange = new ccxtPro[exchangeName]();
      if (exchange != undefined) {
        user.exchange = exchangeName;
        await user.save();
        bot.sendMessage(chatId, "Exchange is set with: " + exchangeName);
      } else {
        bot.sendMessage(chatId, "Exchange is not found");
      }
    } else {
      user.exchange = exchangeName;
      await user.save();
      bot.sendMessage(chatId, "Exchange is set with: " + exchangeName);
    }
  };

  const getAI = async (chatId, data) => {
    let ai = await AI.findOne({
      chatId: chatId,
      displayName: data.displayName,
      symbol: data.symbol,
    });
    return ai;
  };

  const botStatus = async (chatId, bot, data) => {
    let ai = await getAI(chatId, data);
    if (ai == null) return bot.sendMessage(chatId, "Bot not found");
    let message = "Bot status: " + ai.status + "\n";
    if (ai.symbol) message += "Symbol: " + ai.symbol + "\n";
    if (ai.investment) message += "Investment: " + ai.investment + "\n";
    if (ai.startBalance) message += "Start balance: " + ai.startBalance + "\n";
    if (ai.rsi_period) message += "RSI period: " + ai.rsi_period + "\n";
    if (ai.candle) message += "Candle: " + ai.candle + "\n";
    if (ai.rsi_buy) message += "RSI buy: " + ai.rsi_buy + "\n";
    if (ai.rsi_sell) message += "RSI sell: " + ai.rsi_sell + "\n";
    if (ai.stop_loss) message += "Stop loss: " + ai.stop_loss + "\n";
    if (ai.take_profit) message += "Take profit: " + ai.take_profit + "\n";
    if (ai.currentRSI) message += "Current RSI: " + ai.currentRSI + "\n";
    if (ai.intervalTime) message += "Interval time: " + ai.intervalTime + "\n";
    if (ai.currentProfit) message += "Current profit: " + ai.currentProfit + "\n";
    if (ai.profit) message += "Profit: " + ai.profit + "\n";
    bot.sendMessage(chatId, message);
  };

  const setFollowRSI = async (chatId, bot, data) => {
    let ai = await getAI(chatId, data);
    ai.status = "followRSI";
    ai.candle = data.timeFrame;
    ai.rsi_sell = data.rsi_sell;
    ai.rsi_buy = data.rsi_buy;
    ai.rsi_period = data.period;
    ai.intervalTime = data.intervalTime;
    await ai.save();
    bot.sendMessage(
      chatId,
      "Follow RSI is set with symbol: " + data.symbol + " and period: " + data.period + " to sell: " + data.rsi_sell + " to: " + data.rsi_buy
    );
  };

  const createOrer = async (data) => {
    // if (side != undefined) {
    //   let fecthBalance = await exchange.fetchBalance();
    //   let balance = fecthBalance.free[data.symbol.split("/")[0]];
    //   let price = lastPrice.toFixed(4);
    //   data.amount = (balance * data.investment) / price;
    //   let orderId = await exchange.createOrder(data.symbol, data.side, side, amount, price);
    //   message = "Order ID: " + orderId + "\n";
    //   message += "Symbol: " + data.symbol + "\n";
    //   message += "Price: " + price + "\n";
    //   message += "Amount: " + amount + "\n";
    //   message += "Side: " + side + "\n";
    //   message += "Balance: " + balance + "\n";
    // }
  };
  const pause = async (chatId, bot, data) => {};
  const resume = async (chatId, bot, data) => {};
  const stop = async (chatId, bot, data) => {};

  return { start, pause, resume, stop, setFollowRSI, setExchange, botStatus };
};

const Utils = () => {
  const convertTime = (time) => {
    let frame = 1;
    switch (time) {
      case "m":
        frame = 60;
        break;
      case "h":
        frame = 3600;
        break;
      case "d":
        frame = 86400;
        break;
      case "w":
        frame = 604800;
        break;
      case "M":
        frame = 2592000;
        break;
      default:
    }
    return frame * 1000;
  };
  const checkExchange = (data) => {
    let message = "";
    ccxtPro.exchanges.forEach((exchange) => {
      if (exchange.includes(data) || exchange === data) {
        console.log(exchange);
        message += exchange + "\n";
      }
    });
    if (message === "") {
      message = "No exchange found";
    } else message = "Exchange found: \n" + message;
    return message;
  };
  const getSymbols = async () => {};
  return {
    checkExchange,
    getSymbols,
    convertTime,
  };
};

const API = () => {
  const add = async (chatId, bot, data) => {
    if (await checkAPI(data)) {
      const api_exchange = new Api({
        data,
      });
      await api_exchange.save();
    } else {
      bot.sendMessage(chatId, "API keys are invalid");
    }
  };
  const getApis = async (chatId, bot, data) => {
    const apis = await Api.find({
      chatId: chatId,
    });
    let message = "";
    apis.forEach((api) => {
      message += api.exchange + " - " + api.displayName + "\n";
    });
    if (message === "") {
      message = "No API found";
    } else message = "API found: \n" + message;
    bot.sendMessage(chatId, message);
  };

  const remove = async (chatId, data) => {
    try {
      let api = await Api.find({ displayName: data.displayName });
      if (api.userId.toString() !== req.user.id) {
        return res.status(403).json({ message: "You do not have permission to delete this API." });
      }
      await Api.findByIdAndDelete(req.params.id);
      res.json({ message: "API has been deleted" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };

  const checkAPI = async (body) => {
    let exchangeId = body.exchange;
    if (exchangeId.includes("-test")) {
      exchangeId = exchangeId.replace("-test", "");
    }
    let exchange = new ccxtPro[exchangeId]({
      apiKey: body.api,
      secret: body.secret,
      enableRateLimit: true,
      rateLimit: 250,
    });
    if (exchange.id.toLowerCase().includes("bitget")) {
      exchange.password = body.displayName;
    }
    if (body.exchange.includes("-test")) {
      exchange.setSandboxMode(true);
    }
    try {
      let balance = await exchange.fetchBalance();
      return true;
    } catch (error) {
      return false;
    }
  };
  return {
    add,
    getApis,
    remove,
  };
};

const Follow = () => {
  const followRSI = async (chatId, bot, rsi) => {
    if (rsi === undefined) return;
  };

  const unfollow = async (chatId, data) => {};
  return {
    followRSI,
    unfollow,
  };
};

const getRSI = async (ohlcv, period) => {
  const entries = ohlcv.map((entry) => ({
    time: entry[0],
    open: entry[1],
    high: entry[2],
    low: entry[3],
    close: entry[4],
    vollume: entry[5],
  }));
  let arrClose = ohlcv.map((e) => e[4]);
  console.log(arrClose);
  let values = arrClose.slice(-period - 1);
  let input = {
    values: values,
    period: period,
  };
  let rsi = new RSI(input);
  return rsi;
};

const getCurrentPrice = async (exchange, symbol) => {
  if (exchange.has["watchTickers"]) {
    try {
      const tickers = await exchange.watchTickers(symbol);
      console.log(new Date(), tickers);
    } catch (e) {
      console.log(e);
      // stop the loop on exception or leave it commented to retry
      // throw e
    }
  }
};

module.exports = {
  BotTrader,
  Utils,
  API,
  Follow,
};
