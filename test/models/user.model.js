import crypto from 'crypto';
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  salt: { type: String },
  first: { type: String },
  last: { type: String }
});

const generateHash = function(password, salt) {
  return password + salt;
};
const hashPassword = function(next) {
  this.salt = 'salt';
  this.password = generateHash(this.password, this.salt);
  next();
};
userSchema.pre('save', hashPassword);

userSchema.methods.passwordMatches = function(password) {
  return generateHash(password, this.salt) == this.password;
};

export default userSchema;