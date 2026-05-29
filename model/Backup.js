const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Backup = Schema({
  filename: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  size: { type: Number, default: 0 },
  status: { type: String, enum: ["Success", "Failed"], default: "Success" },
  triggeredBy: { type: String, default: "System" }
});

module.exports = mongoose.model("Backup", Backup);
