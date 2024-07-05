const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const register = async (chatId) => {
  // const { username, password, email, phone } = req.body;
  const membership = "member";
  var user = new User({ chatId, membership });
  user.eventListenNewSymbol = true;
  try {
    await user.save();
    return { message: "Register successfully" };
  } catch (error) {
    return { message: error };
  }
};

const verify = async (req, res) => {
  const token = req.header("auth-token");
  if (!token) return res.status(401).send({ message: "Access Denied" });
  else {
    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);
      req.user = verified;
      res.send({ message: "Verified" });
    } catch (err) {
      res.status(400).send({ message: "Invalid Token" });
    }
  }
};

const checkExist = async (chatId) => {
  const user = await User.findOne({ chatId:chatId });

  if(user) return user;
  return false;
};

const login = async (chatId) => {
  let user = await checkExist(chatId);
  if (!user){
   return await register(chatId);
  }
  return { message: "Welcome back! You are already registered" };
};

module.exports = { register, login, verify, checkExist };
