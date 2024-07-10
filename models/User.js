const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { exchanges } = require('ccxt');

const UserSchema = new mongoose.Schema({
    chatId: String,
    username: String,
    password: String, 
    email:String,
    phone:String,
    expiresIn:String,
    membership:String,
    telegram:String,
    exchange: String,
});

UserSchema.pre('save', async function(next) {
    if (this.isModified('password')) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

const User = mongoose.model('User', UserSchema);

module.exports = User;
