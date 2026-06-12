const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  transactionNumber: { type: String, required: true, unique: true },
  invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
  cashier: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  type: { type: String, enum: ["sale", "refund", "void"], default: "sale" },
  isSynced: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", TransactionSchema);
