const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const register = async (req, res) => {
  const { username, password, email, phone } = req.body;
  const membership = "member";
  const user = new User({ username, password, email, phone, membership });
  try {
    await user.save();
    res.send({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).send({ message: "User register not  success" });
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

module.exports = { register, login };
