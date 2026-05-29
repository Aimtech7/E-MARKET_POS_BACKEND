const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, default: "System User" },
  email: { type: String, default: "" },
  phone: { type: String, default: "" },
  role: { type: String, enum: ["admin", "cashier"], default: "cashier" },
  admin: { type: Boolean, default: false }, // Preserved for backwards compatibility
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

module.exports = mongoose.model("User", UserSchema);
