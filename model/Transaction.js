const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  transactionNumber: { type: String, required: true, unique: true },
  invoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
  cashier: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  paymentProvider: { type: String, enum: ["cash", "card", "mpesa", "paystack"], default: "cash" },
  externalReference: { type: String }, // For M-Pesa CheckoutRequestID or Paystack reference
  paymentStatus: { type: String, enum: ["pending", "completed", "failed", "refunded"], default: "completed" },
  paymentMetadata: { type: Schema.Types.Mixed }, // Store raw payment response if needed
  totalAmount: { type: Number, required: true },
  type: { type: String, enum: ["sale", "refund", "void"], default: "sale" },
  isSynced: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transaction", TransactionSchema);
