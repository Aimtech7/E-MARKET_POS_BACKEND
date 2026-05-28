const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const RefundedItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true },
  refundAmount: { type: Number, required: true }
});

const RefundSchema = new Schema({
  refundNumber: { type: String, required: true, unique: true },
  originalInvoice: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
  refundedItems: [RefundedItemSchema],
  totalRefundedAmount: { type: Number, required: true },
  reason: { type: String, default: "Customer Request" },
  cashier: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Refund", RefundSchema);
