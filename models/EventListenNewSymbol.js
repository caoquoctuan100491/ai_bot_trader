const mongoose = require("mongoose");

const EventListenNewSymbolSchema = new mongoose.Schema({
  exchange: String,
  userId: String,
  eventListenNewSymbol:Boolean
});

EventListenNewSymbolSchema.pre("save", async function (next) {
  // this.secret = awSymbolt bcrypt.decodeBase64(this.secret);
  next();
});

const EventListenNewSymbol = mongoose.model("eventListenNewSymbol", EventListenNewSymbolSchema);

module.exports = EventListenNewSymbol;
