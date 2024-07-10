const mongoose = require("mongoose");

const AISchema = new mongoose.Schema({
  displayName: String,
  status: String,
  symbol: String,
  candle: String,
  intervalTime: Number,
  investment: String,
  startBalance: String,
  rsi_period: Number,
  rsi_buy: Number,
  rsi_sell: Number,
  stop_loss: Number,
  take_profit: Number,
  chatId: String,
  profit: String,
  currentProfit: String,
  currentRSI: String,
});

AISchema.pre("save", async function (next) {
  // this.secret = await bcrypt.decodeBase64(this.secret);
  next();
});

const AI = mongoose.model("AI", AISchema);

module.exports = AI;
