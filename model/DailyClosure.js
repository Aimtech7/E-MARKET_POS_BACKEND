const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DailyClosureSchema = new Schema({
  date: { type: Date, required: true },
  cashier: { type: String, required: true },
  openingBalance: { type: Number, default: 0 },
  expectedCash: { type: Number, required: true },
  actualCash: { type: Number, required: true },
  difference: { type: Number, required: true },
  totalSales: { type: Number, required: true },
  totalRefunds: { type: Number, required: true },
  notes: { type: String },
  isSynced: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DailyClosure", DailyClosureSchema);
