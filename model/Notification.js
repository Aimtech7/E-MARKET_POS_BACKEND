const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Notification = Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ["alert", "info", "success", "warning"], default: "info" },
  isRead: { type: Boolean, default: false },
  link: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", Notification);
