const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Api = require("../models/Exchange_API");
const ccxt = require("ccxt");
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

const addAPI = async (req, res) => {
  const { displayName, api, secret, exchange } = req.body;
  if (await checkAPI(req.body)) {
    const obj = await Api.findOne({ api: api });
    if (obj) {
      res.status(400).send({ message: "Api exist" });
    } else {
      const userId = req.user.id;
      const api_exchange = new Api({
        exchange,
        displayName,
        api,
        secret,
        userId,
        status: true,
      });
      try {
        await api_exchange.save();
        res.send({ message: "API keys are valid" });
      } catch (error) {
        res.status(400).send({ message: "Add api have error" });
      }
    }
  } else {
    res.status(400).send({ message: "API keys are invalid" });
  }
};

const updateAPI = async (req, res) => {
  try {
    let obj = await Api.findById(req.params.id);

    if (obj.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You do not have permission to update this API." });
    }

    const { displayName, exchange, api, secret, status } = req.body;
    if (displayName) obj.displayName = displayName;
    if (exchange) obj.exchange = exchange;
    if (api) obj.apiKey = api;
    if (secret) obj.secret = secret;
    obj.status = status;
    let updateAble = true;
    if (api && secret) {
      updateAble = await checkAPI(obj);
    }
    if (updateAble) {
      await obj.save();
      res.json({ message: "Updated" });
    } else {
      res.status(400).send({ message: "API keys are invalid" });
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

const deleteAPI = async (req, res) => {
  try {
    let api = await Api.findById(req.params.id);
    if (api.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You do not have permission to delete this API." });
    }
    await Api.findByIdAndDelete(req.params.id);
    res.json({ message: "API has been deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getListAPI = async (req, res) => {
  try {
    const apis = await Api.find({ userId: req.user.id });
    let data = [];
    apis.forEach((element) => {
      data.push({
        displayName: element.displayName,
        api: element.api,
        exchange: element.exchange,
        id: element._id,
        statusApi: element.status,
      });
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addAPI, getListAPI, updateAPI, deleteAPI };
