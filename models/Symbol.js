const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SymbolSchema = new mongoose.Schema({
  exchange: String,
  symbol: String,
});

SymbolSchema.pre("save", async function (next) {
  // this.secret = awSymbolt bcrypt.decodeBase64(this.secret);
  next();
});

const Symbol = mongoose.model("Symbol", SymbolSchema);

module.exports = Symbol;
