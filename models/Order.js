const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const OrderSchema = new mongoose.Schema({
  exchange: String,
  status: String,
  account: String,
  symbol: String,
  candle: Number,
  investment: Number,
  currentBalance:Number,
  rsi_buy: Number,
  rsi_sell: Number,
  stop_loss: Number,
  take_profit: Number,
  userId: String,
  amount:Number,
  profit: Number,
  orderId:String
});

OrderSchema.pre("save", async function (next) {
  // this.secret = awOrdert bcrypt.decodeBase64(this.secret);
  next();
});

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
