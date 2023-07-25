const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AI = require("../models/AI");
const Order = require("../models/Order");
const Symbol = require("../models/Symbol");
const Api = require("../models/Exchange_API");
const ccxt = require("ccxt");
const technicalindicators = require("technicalindicators");
const { query } = require("express");
const { default: axios } = require("axios");
const User = require("../models/User");

const utils = {
  getExchange: (body) => {
    let exchangeId = body;
    if (body.exchange) {
      exchangeId = body.exchange;
    }
    if (exchangeId.includes("-test")) {
      exchangeId = exchangeId.replace("-test", "");
    }
    let exchange = new ccxt[exchangeId]({
      enableRateLimit: true,
      rateLimit: 250,
    });
    if (body.api && body.secret) {
      exchange.apiKey = body.api;
      exchange.secret = body.secret;
    }
    if (exchange.id.toLowerCase().includes("bitget")) {
      exchange.password = body.displayName;
    }
    if (body.exchange?.includes("-test")) {
      exchange.setSandboxMode(true);
    }
    return exchange;
  },
  getBalance: async (body) => {
    let exchange = await utils.getExchange(body);
    try {
      let balance = await exchange.fetchBalance();
      return balance;
    } catch (err) {
      console.log(err);
    }
  },

  getSymbols: async (exchangeId) => {
    let exchange = utils.getExchange(exchangeId);
    await exchange.loadMarkets();
    const symbols = Object.keys(exchange.markets);
    return symbols;
  },
};

const fetchBalance = async (req, res) => {
  try {
    let obj = await Api.findById(req.query.id);
    if (obj.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You do not have permission to update this API." });
    }
    let balance = await utils.getBalance(obj);
    res.json(balance);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const fetchSymbols = async (req, res) => {
  try {
    let symbols = await Symbol.find({ exchange: req.query.exchange });
    if (symbols.length == 0) {
      symbols = await utils.getSymbols(req.query.exchange);
      symbols.forEach((symbol) => {
        let obj = new Symbol(req.query.exchange, symbol);
        obj.save();
      });
    }
    res.json(symbols);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const updateNewSymbol = async (req, res) => {
  let user = await User.findById(req.user.id);
  let time = 24 * 60 * 1000;
  let intervalTime = setInterval(async () => {
    if (user.eventUpdateNewSymbol) {
      let array = await Symbol.find({ exchange: req.query.exchange });
      let symbols = await utils.getSymbols(req.query.exchange);
      if (array.length == 0) {
        for (let symbol in symbols) {
          if (!JSON.parse(array).includes(symbol)) {
            console.log(symbol);
            sendTelegram("new symbol has listed on" + req.query.exchange +": " + symbol);
          } else {
            console.log("exists");
          }
        }
      }
    } else {
      clearInterval(intervalTime);
    }
  }, time);
};

async function run(AIdoc) {
  try {
    let api = await Api.findById(AIdoc.account);
    let exchange = utils.getExchange(api);
    let intervalID = setInterval(async () => {
      let obj = await AI.findById(AIdoc._id);
      let intervalTime = obj.candle / 60000;
      candleTime = intervalTime + "m";
      if (intervalTime >= 60) {
        intervalTime = intervalTime / 60;
        candleTime = intervalTime + "h";
        if (intervalTime >= 24) {
          intervalTime = intervalTime / 24;
          candleTime = intervalTime + "d";
        }
      }

      let balance = await exchange.fetchBalance();
      if (
        balance.free[obj.symbol.split("/")[1]] >= obj.investment &&
        api.status
      ) {
        if (obj) {
          if (obj.status == "stop") {
            clearInterval(intervalID);
            await AI.findByIdAndDelete(AIdoc._id);
          } else {
            await exchange.loadMarkets();
            let market = exchange.markets["APT/BUSD"];
            // console.log(market.taker);
            // console.log(market.maker);
            console.log(candleTime);
            const candles = await exchange.fetchOHLCV("APT/BUSD", candleTime);
            const close = candles.map((c) => c[4]);

            const rsiPeriod = 14;
            let rsiInput = {
              values: close.slice(-rsiPeriod - 1),
              period: rsiPeriod,
            };
            const rsi = await technicalindicators.RSI.calculate(rsiInput);
            const lastRsi = rsi[rsi.length - 1];

            const smaPeriod = 20;
            const sma = technicalindicators.SMA.calculate({
              values: close.slice(-smaPeriod),
              period: smaPeriod,
            });
            const lastSma = sma[sma.length - 1];

            const bbPeriod = 20;
            const stdDev = 2;
            const bb = technicalindicators.BollingerBands.calculate({
              values: close.slice(-bbPeriod),
              period: bbPeriod,
              stdDev,
            });
            const lastBb = bb[bb.length - 1];

            console.log("RSI:", lastRsi);
            console.log("SMA:", lastSma);
            console.log("Bollinger Bands:", lastBb);

            // Fetch current ticker data
            let ticker = await exchange.fetchTicker(AIdoc.symbol);
            // Get last close price
            let lastPrice = ticker["last"];
            console.log(lastPrice);
            let order;

            if (lastRsi <= obj.rsi_buy) {
              // lastRsi <= obj.rsi_buy && lastPrice > lastSma && lastPrice < lastBb.lower
              // Buy
              order = await exchange.createOrder(
                AIdoc.symbol,
                "market",
                "buy",
                obj.currentBalance,
                lastPrice
              );
              console.log(order);
              obj.amount = order.executedQty;
              sendTelegram(
                "CapricornTrader buy " +
                  obj.symbol.split("/")[0] +
                  " with price: " +
                  lastPrice
              );
            }

            if (
              obj.amount > 0 &&
              lastRsi >= obj.rsi_sell
            ) {
              //Sell
              order = await exchange.createOrder(
                AIdoc.symbol,
                "market",
                "sell",
                obj.amount,
                lastPrice
              );
              console.log(order);
              obj.currentBalance = obj.amount * lastPrice * (1 - market.maker);
              obj.profit =
                ((obj.currentBalance - obj.investment) / obj.investment) * 100;
              sendTelegram(
                "CapricornTrader sell " +
                  obj.symbol.split("/")[0] +
                  " with price: " +
                  lastPrice
              );
            }
            await obj.save();
          }
        }
      }
    }, 30000);
  } catch (error) {
    console.log(error);
  }
}

const resume = async (req, res) => {
  try {
    const aiTraders = await AI.find();
    aiTraders.forEach((aiTrader) => {
      run(aiTrader);
    });
  } catch (err) {
    console.log(err);
  }
};

const start = async (req, res) => {
  let body = req.body;
  let obj = await Api.findById(body.account);
  if (obj.userId.toString() !== req.user.id) {
    return res
      .status(403)
      .json({ message: "You do not have permission to update this API." });
  }

  // let exchange = utils.getExchange(obj);
  // await exchange.loadMarkets();

  let AIdoc = new AI();
  AIdoc.exchange = body.exchange;
  AIdoc.status = "running";
  AIdoc.account = body.account;
  AIdoc.symbol = body.symbol;
  AIdoc.candle = body.candle;
  AIdoc.investment = body.investment;
  AIdoc.currentBalance = body.investment;
  AIdoc.rsi_buy = body.rsi_buy;
  AIdoc.rsi_sell = body.rsi_sell;
  AIdoc.take_profit = body.take_profit;
  AIdoc.stop_loss = body.stop_loss;
  AIdoc.userId = req.user.id;
  AIdoc.amount = 0;
  AIdoc.profit = 0;

  try {
    AIdoc.save();
    run(AIdoc);
    res.json({ message: "Started" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getListAITrader = async (req, res) => {
  try {
    const aiTraders = await AI.find({ userId: req.user.id });
    res.json(aiTraders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const stop = async (req, res) => {
  try {
    let api = await AI.findById(req.params.id);
    if (api.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this API." });
    }
    await AI.findByIdAndDelete(req.params.id);
    res.json({ message: "API has been deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAI = async (AIdoc, data) => {
  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      AIdoc[key] = data[key];
    }
  }
  await AIdoc.save();
};

const update = async (req, res) => {
  try {
    console.log(req.params.id);
    let AIdoc = await AI.findById(req.params.id);
    if (AIdoc.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You do not have permission to update this API." });
    }
    await updateAI(AIdoc, req.body);
    res.json({ message: "Updated" });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const sendTelegram = async (sendMSG) => {
  let telegram_api =
    "https://api.telegram.org/bot6379516028:AAEScTUM7Peg7LQXb0mqdXo-fgDiycrEYEM";
  let telegramId = await getTelegramId(telegram_api, "MardSilver", "userId");
  await axios.post(telegram_api + "/sendMessage", {
    chat_id: 1856763891,
    text: sendMSG,
  });
};

let getTelegramId = async (telegram_api, title, type) => {
  let teleGetUpdates = await axios.post(telegram_api + "/getUpdates");
  let getUpdatesResult = teleGetUpdates.data.result;
  for (let index = 0; index < getUpdatesResult.length; index++) {
    const element = getUpdatesResult[index];
    if (element.my_chat_member && type === "chatId") {
      if (
        element.my_chat_member.chat.title.toLowerCase() === title.toLowerCase()
      ) {
        return element.my_chat_member.chat.id;
      }
    }

    if (element.message && type === "userId") {
      if (element.message.chat.username.toLowerCase() === title.toLowerCase()) {
        return element.message.chat.id;
      }
    }
  }
};

module.exports = {
  start,
  getListAITrader,
  update,
  stop,
  resume,
  fetchBalance,
  fetchSymbols,
  updateNewSymbol,
};
