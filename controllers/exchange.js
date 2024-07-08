const ccxt = require("ccxt");
const RSI = require("technicalindicators").RSI;
const Api = require("../models/Exchange_API");
const AI = require("../models/AI");
const Order = require("../models/Order");
const WebSocket = require("ws");
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
      // const ticker = await exchange.fetchTicker(data.symbol);
      const lastPrice = await getCurrentPrice(exchange, data.symbol);
      let rsi = await getRSI(data);

      if (rsi.nextValue(lastPrice) >= data.top) {
        side = "sell";
      } else if (rsi.nextValue(lastPrice) <= data.bottom) {
        side = "buy";
      }
      if (side != undefined) {
        let fecthBalance = await exchange.fetchBalance();
        let balance = fecthBalance.free[data.symbol.split("/")[0]];
        let price = lastPrice.toFixed(4);
        data.amount = (balance * data.investment) / price;
        // let order = {
        //   exchange: data.exchange,
        //   status: side,
        //   symbol: data.symbol,
        //   candle: data.timeFrame,
        //   investment: data.investment,
        //   rsi_buy: data.top,
        //   rsi_sell: data.bottom,
        //   stop_loss: data.stopLoss,
        //   take_profit: data.takeProfit,
        //   amount: amount,
        //   profit: 0,
        // };
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
    console.log(data.chatId + " followSRI " + data.symbol + "SRI " + data.period + " " + data.top + " - " + data.bottom);
    data.interval = setInterval(async () => {
      let exchange = new ccxt[data.exchange]();
      // const ticker = await exchange.fetchTicker(data.symbol);
      const lastPrice = await getCurrentPrice(exchange, data.symbol);
      let rsi = await getRSI(data);
      message = "RSI: " + rsi.nextValue(lastPrice) + "\n";
      message += "Price: " + lastPrice + "\n";
      if (rsi.nextValue(lastPrice) >= data.top) {
        message = "Exceeded selling point." + "\n" + message;
        bot.sendMessage(chatId, message);
      } else if (rsi.nextValue(lastPrice) <= data.bottom) {
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

const getCurrentPrice = async (exchange, symbol) => {
  try {
    const strSymbol = symbol.replace("/", "").toLowerCase();
    let url = "";
    let wsURL = "";
    if (exchange === "binance") {
      url = "wss://stream.binance.com:9443/ws/";
      wsURL = url + strSymbol + "@ticker";
    }

    // Kết nối WebSocket
    const ws = new WebSocket(wsURL);

    ws.on("open", () => {
      console.log("WebSocket kết nối thành công");
    });

    ws.on("message", (data) => {
      const ticker = JSON.parse(data);

      // Lấy giá hiện tại từ ticker
      const price = ticker.c; // 'c' là giá hiện tại (last price)
      console.log(`Giá hiện tại của BTC/USDT: ${price}`);
      return price;
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    ws.on("close", () => {
      console.log("WebSocket đóng kết nối");
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  BotTrader,
  Utils,
  API,
  Follow,
};
