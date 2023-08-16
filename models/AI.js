const mongoose = require("mongoose");

const AISchema = new mongoose.Schema({
  exchange: String,
  status: String,
  account: String,
  symbol: String,
  candle: Number,
  investment: String,
  currentBalance: String,
  rsi_buy: Number,
  rsi_sell: Number,
  stop_loss: Number,
  take_profit: Number,
  userId: String,
  amount: String,
  profit: String,
  currentProfit: String,
  currentRSI: String
});

AISchema.pre("save", async function (next) {
  // this.secret = await bcrypt.decodeBase64(this.secret);
  next();
});

const AI = mongoose.model("AI", AISchema);

module.exports = AI;
