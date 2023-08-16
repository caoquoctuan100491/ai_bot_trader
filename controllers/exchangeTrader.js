const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AI = require("../models/AI");
const Order = require("../models/Order");
const Symbol = require("../models/Symbol");
const Api = require("../models/Exchange_API");
const User = require("../models/User");
const EventListenNewSymbol = require("../models/EventListenNewSymbol");
const ccxt = require("ccxt");
const technicalindicators = require("technicalindicators");
const { query } = require("express");
const { default: axios } = require("axios");

const SocketIO = require("../socket/socket");

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
    let exchange = req.query.exchange;
    let symbols = await Symbol.find({ exchange: exchange });
    if (symbols.length == 0) {
      symbols = await utils.getSymbols(exchange);
      symbols.forEach((symbol) => {
        let obj = new Symbol({ symbol, exchange });
        obj.save();
      });
    }
    res.json(symbols);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: err.message });
  }
};

const updateNewSymbol = async (obj) => {
  let time = 24 * 60 * 60 * 1000;
  let intervalTime = setInterval(async () => {
    if (obj.eventListenNewSymbol) {
      let array = await Symbol.find({ exchange: obj.exchange });
      let symbols = await utils.getSymbols(obj.exchange);
      if (array.length > 0) {
        array.forEach((objSymbol) => {
          for (let symbol in symbols) {
            if (objSymbol.symbol === symbol) {
              sendTelegram(
                "new symbol has listed on" + exchange + ": " + symbol
              );
            }
          }
        });
      }
    } else {
      clearInterval(intervalTime);
    }
  }, time);
};

const toggleListentNewSymbol = async (req, res) => {
  try {
    let obj = await EventListenNewSymbol.findOne({
      userId: req.user.id,
      exchange: req.body.exchange,
    });

    if (obj) {
      if (obj.eventListenNewSymbol) {
        obj.eventListenNewSymbol = false;
      } else {
        obj.eventListenNewSymbol = true;
      }
    } else {
      let exchange = req.body.exchange;
      let userId = req.user.id;
      let eventListenNewSymbol = true;
      obj = new EventListenNewSymbol({
        exchange,
        userId,
        eventListenNewSymbol,
      });
      updateNewSymbol(obj);
    }
    obj.save();
    res.json(obj);
  } catch (error) {
    console.log(error);
  }
};

const statusListentNewSymbols = async (req, res) => {
  let obj = await EventListenNewSymbol.findOne({
    userId: req.user.id,
    exchange: req.query.exchange,
  });
  console.log(obj);
  res.json(obj);
};

async function run(AIdoc) {
  let api = await Api.findById(AIdoc.account);
  let exchange = utils.getExchange(api);
  let runInterval = async () => {
    console.log("************************************");
    console.log("          ");
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
    if (obj) {
      if (obj.status == "stop") {
        clearInterval(intervalID);
        await AI.findByIdAndDelete(AIdoc._id);
      } else {
        await exchange.loadMarkets();
        let market = exchange.markets[obj.symbol];
        // console.log(market.taker);
        // console.log(market.maker);
        console.log(candleTime);
        const candles = await exchange.fetchOHLCV(obj.symbol, candleTime);
        const close = candles.map((c) => c[4]);

        const rsiPeriod = 14;
        let rsiInput = {
          values: close.slice(-rsiPeriod - 1),
          period: rsiPeriod,
        };
        const rsi = await technicalindicators.RSI.calculate(rsiInput);
        const lastRsi = rsi[rsi.length - 1];
        obj.currentRSI = lastRsi;

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
        // console.log("SMA:", lastSma);
        // console.log("Bollinger Bands:", lastBb);

        // Fetch current ticker data
        let ticker = await exchange.fetchTicker(AIdoc.symbol);
        // Get last close price
        let lastPrice = ticker["last"];
        let order;
        console.log("LastPrice: " + lastPrice);
        if (!obj.currentBalance) {
          obj.currentBalance = parseFloat(obj.investment);
        }
        if (!obj.amount) {
          obj.amount = 0;
        }
        obj.currentProfit =
        (( balance.free[obj.symbol.split("/")[0]]*lastPrice - obj.investment) / obj.investment) * 100;
        let amountToBuy = (parseFloat(obj.currentBalance) / lastPrice).toFixed(
          4
        );
        if (
          lastRsi <= obj.rsi_buy &&
          balance.free[obj.symbol.split("/")[1]] >=
            parseFloat(obj.currentBalance) &&
          amountToBuy >= market.precision.amount
        ) {
          // lastRsi <= obj.rsi_buy && lastPrice > lastSma && lastPrice < lastBb.lower
          // Buy
          try {
            order = await exchange.createMarketBuyOrder(
              AIdoc.symbol,
              amountToBuy
            );

            obj.currentBalance = 0;
            obj.amount = (order.amount - order.amount* market.taker).toFixed(4);
            sendTelegram(
              "CapricornTrader buy " +
                obj.symbol.split("/")[0] +
                " with price: " +
                lastPrice +
                " at RSI: " +
                lastRsi
            );
            let objOrder = new Order(obj);
            objOrder.save();
          } catch (error) {
            console.log(error);
            sendTelegram(
              "[Error] Create order buy " +
                amountToBuy +
                obj.symbol.split("/")[0] +
                " !!! RSI: " +
                lastRsi +
                " at price " +
                lastPrice +
                " with " +
                obj.currentBalance +
                obj.symbol.split("/")[1]
            );
            sendTelegram("error:" + error);
          }
        }

        if (
          balance.free[obj.symbol.split("/")[0]] >= obj.amount &&
          obj.amount > 0 &&
          lastRsi >= obj.rsi_sell
        ) {
          //Sell
          try {
            order = await exchange.createOrder(
              AIdoc.symbol,
              "market",
              "sell",
              obj.amount
            );
            console.log(order);
            obj.currentBalance = obj.amount * lastPrice * (1 - market.maker);
            obj.profit =
              ((obj.currentBalance - obj.investment) / obj.investment) * 100;
            sendTelegram(
              "CapricornTrader sell " +
                obj.symbol.split("/")[0] +
                " with price: " +
                lastPrice +
                " at RSI: " +
                lastRsi
            );
            let objOrder = new Order(obj);
            objOrder.save();
          } catch (error) {
            console.log(error);
            sendTelegram(
              "have error when create order sell " +
                obj.symbol.split("/")[0] +
                " !!! RSI: " +
                lastRsi +
                " at price " +
                lastPrice +
                " with " +
                obj.amount
            );
            sendTelegram("error:" + error);
          }
        }
        await obj.save();
      }
    }
  };
  runInterval();
  let intervalID = setInterval(async () => {
    runInterval();
  }, 60000);
}

const resume = async () => {
  try {
    const aiTraders = await AI.find();
    aiTraders.forEach((aiTrader) => {
      run(aiTrader);
    });

    const eventListenNewSymbol = await EventListenNewSymbol.find();
    eventListenNewSymbol.forEach((event) => {
      updateNewSymbol(event);
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
  toggleListentNewSymbol,
  statusListentNewSymbols,
};
