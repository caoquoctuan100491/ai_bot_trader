const ccxt = require("ccxt");
const RSI = require("technicalindicators").RSI;
const Api = require("../models/Exchange_API");
const AI = require("../models/AI");
let arrInterval = [];

const BotTrader = () => {
  const start = async (chatId, bot, data) => {
    let intervalTime = 10000;
    if (data.intervalTime.includes("s")) {
      intervalTime = parseInt(data.intervalTime.replace("s", "")) * 1000;
    }
    let message = "";
    for (let i = 0; i < arrInterval.length; i++) {
      if (arrInterval[i].chatId == chatId && arrInterval[i].exchange === data.exchange && arrInterval[i].symbol === data.symbol) {
        clearInterval(arrInterval[i].interval);
        arrInterval.splice(i, 1);
      }
    }
    data.chatId = chatId;
    let side;
    data.interval = setInterval(async () => {
      let exchange = new ccxt[data.exchange]();
      const ticker = await exchange.fetchTicker(data.symbol);
      let rsi = await getRSI(data);

      if (rsi.nextValue(ticker.last) >= data.top) {
        side = "sell";
      } else if (rsi.nextValue(ticker.last) <= data.bottom) {
        side = "buy";
      }
      if (side != undefined) {
        let fecthBalance = await exchange.fetchBalance();
        let balance = fecthBalance.free[data.symbol.split("/")[0]];
        let price = ticker.last.toFixed(4);
        let amount = (balance * data.investment) / price;
        let order = {
          symbol: data.symbol,
          type: side,
          amount: amount,
          price: price,
          side: data.side,
        };
        let orderId = await exchange.createOrder(data.symbol, data.side, side, amount, price);

        let ai = new AI(order);
        ai.save();

        message = "Order ID: " + orderId + "\n";
        message += "Symbol: " + data.symbol + "\n";
        message += "Price: " + price + "\n";
        message += "Amount: " + amount + "\n";
        message += "Side: " + side + "\n";
        message += "Balance: " + balance + "\n";
      }

      if (message != "") {
        bot.sendMessage(chatId, message);
      }
    }, intervalTime);
    arrInterval.push(data);
  };

  const createOrer = async (data) => {};
  const pause = async (chatId, bot, data) => {};
  const resume = async (chatId, bot, data) => {};
  const stop = async (chatId, bot, data) => {};

  return { start, pause, resume, stop };
};

const Utils = () => {
  const checkExchange = (data) => {
    let message = "";
    ccxt.exchanges.forEach((exchange) => {
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
    let exchange = new ccxt[exchangeId]({
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
  const followSRI = async (chatId, bot, data) => {
    let intervalTime = 10000;
    if (data.intervalTime.includes("s")) {
      intervalTime = parseInt(data.intervalTime.replace("s", "")) * 1000;
    }
    let message = "";

    for (let i = 0; i < arrInterval.length; i++) {
      if (arrInterval[i].chatId == chatId && arrInterval[i].exchange === data.exchange && arrInterval[i].symbol === data.symbol) {
        clearInterval(arrInterval[i].interval);
        arrInterval.splice(i, 1);
      }
    }
    data.chatId = chatId;
    data.interval = setInterval(async () => {
      let exchange = new ccxt[data.exchange]();
      const ticker = await exchange.fetchTicker(data.symbol);
      let rsi = await getRSI(data);
      message = "RSI: " + rsi.nextValue(ticker.last) + "\n";
      message += "Price: " + ticker.last + "\n";
      if (rsi.nextValue(ticker.last) >= data.top) {
        message = "Exceeded selling point." + "\n" + message;
        bot.sendMessage(chatId, message);
      } else if (rsi.nextValue(ticker.last) <= data.bottom) {
        message = "Exceeded buying point." + "\n" + message;
        bot.sendMessage(chatId, message);
      }
    }, intervalTime);
    arrInterval.push(data);
  };

  const unfollow = async (chatId, data) => {
    for (let i = 0; i < arrInterval.length; i++) {
      if (arrInterval[i].chatId == chatId && arrInterval[i].exchange === data.exchange && arrInterval[i].symbol === data.symbol) {
        clearInterval(arrInterval[i].interval);
        arrInterval.splice(i, 1);
      }
    }
  };
  return {
    followSRI,
    unfollow,
  };
};

const getRSI = async (data) => {
  let exchange = new ccxt[data.exchange]();
  const ticker = await exchange.fetchTicker(data.symbol);
  let ohlcv = await exchange.fetchOHLCV(data.symbol, data.timeFrame);
  const entries = ohlcv.map((entry) => ({
    time: entry[0],
    open: entry[1],
    high: entry[2],
    low: entry[3],
    close: entry[4],
    vollume: entry[5],
  }));
  let arrClose = entries.map((e) => e.close);
  let values = arrClose.slice(-data.period - 1);
  let input = {
    values: values,
    period: data.period,
  };
  let rsi = new RSI(input);
  return rsi;
};

module.exports = {
  BotTrader,
  Utils,
  API,
  Follow,
};
