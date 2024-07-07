const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  status: String,
  displayName: String,
  symbol: String,
  candle: Number,
  chatId: String,
  amount: Number,
  price: Number,
  aiId: String,
  orderId: String,
});

OrderSchema.pre("save", async function (next) {
  // this.secret = awOrdert bcrypt.decodeBase64(this.secret);
  next();
});

const Order = mongoose.model("Order", OrderSchema);

module.exports = Order;
