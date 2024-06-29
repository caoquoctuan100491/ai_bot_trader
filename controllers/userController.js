const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const register = async (req, res) => {
  const { username, password, email, phone } = req.body;
  const membership = "member";
  var user = new User({ username, password, email, phone, membership });
  user.eventListenNewSymbol = true;
  try {
    await user.save();
    res.send({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).send({ message: "User register not  success" });
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

const login = async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).send({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).send({ message: "Invalid password" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "168h",
  });

  res.send({ message: "Logged in successfully", token });
};

module.exports = { register, login , verify};
