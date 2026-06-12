const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentLogSchema = new Schema({
  provider: { type: String, enum: ["mpesa", "paystack"], required: true },
  transactionId: { type: String }, // Can be the internal transaction ID it relates to
  externalReference: { type: String, unique: true, sparse: true }, // CheckoutRequestID or Paystack Reference
  type: { type: String, enum: ["request", "webhook_callback"], required: true },
  status: { type: String },
  payload: { type: Schema.Types.Mixed }, // Raw JSON data
  webhookPayload: { type: Schema.Types.Mixed }, // Payload from the final webhook
  reconciliationStatus: { type: String, enum: ["pending", "reconciled", "failed"], default: "pending" },
  retryCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PaymentLog", PaymentLogSchema);
