const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const APISchema = new mongoose.Schema({
  displayName: String,
  api: String,
  secret: String,
  exchange: String,
  userId: String,
  status: Boolean,
});

APISchema.pre("save", async function (next) {
  this.secret = await bcrypt.decodeBase64(this.secret);
  next();
});

const API = mongoose.model("API", APISchema);

module.exports = API;
