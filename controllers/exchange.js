const ccxt = require("ccxt");
const RSI = require("technicalindicators").RSI;
let arrInterval = [];
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
  const add = async (chatId, data) => {};
  const update = async (chatId, data) => {};
  const remove = async (chatId, data) => {};
  return {
    add,
    update,
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
      if (data.chatId == chatId && arrInterval[i].exchange === data.exchange && arrInterval[i].symbol === data.symbol) {
        console.log("Already following");
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
      if (data.chatId == chatId && arrInterval[i].exchange === data.exchange && arrInterval[i].symbol === data.symbol) {
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
  Utils,
  API,
  Follow,
};
