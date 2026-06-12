const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ExpenseSchema = new Schema({
  title: { type: String, required: true },
  category: {
    type: String,
    enum: ["Rent", "Salaries", "Utilities", "Fuel", "Marketing", "Stock Purchases", "Miscellaneous"],
    required: true
  },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  createdBy: { type: String },
  isSynced: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Expense", ExpenseSchema);
