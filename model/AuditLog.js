const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AuditLog = Schema({
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  username: { type: String, default: "Anonymous" },
  method: { type: String },
  url: { type: String },
  payload: { type: Object },
});

module.exports = mongoose.model("AuditLog", AuditLog);
