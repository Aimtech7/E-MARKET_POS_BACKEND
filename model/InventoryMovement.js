const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const InventoryMovementSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true }, // Legacy name
  quantity: { type: Number }, // New requested name
  type: { type: String, enum: ["restock", "sale", "refund", "adjustment", "expiry_void", "add", "remove"], required: true }, // Legacy
  action: { type: String, enum: ["add", "remove", "adjust", "sale", "refund", "restock"] }, // New requested name
  reason: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("InventoryMovement", InventoryMovementSchema);
