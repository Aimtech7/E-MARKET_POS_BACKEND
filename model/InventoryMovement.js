const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const InventoryMovementSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true }, // Positive for stock in, Negative for stock out
  type: { type: String, enum: ["restock", "sale", "refund", "adjustment", "expiry_void"], required: true },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("InventoryMovement", InventoryMovementSchema);
