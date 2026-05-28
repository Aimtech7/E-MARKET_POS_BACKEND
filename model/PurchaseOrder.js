const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const PurchaseOrderItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  qty: { type: Number, required: true },
  price: { type: Number, required: true }
});

const PurchaseOrderSchema = new Schema({
  poNumber: { type: String, required: true, unique: true },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  items: [PurchaseOrderItemSchema],
  status: { type: String, enum: ["Draft", "Ordered", "Received", "Cancelled"], default: "Draft" },
  totalAmount: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PurchaseOrder", PurchaseOrderSchema);
