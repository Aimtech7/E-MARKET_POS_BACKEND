const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const GRNItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  productName: { type: String, required: true },
  orderedQty: { type: Number, required: true },
  receivedQty: { type: Number, required: true },
  unitCost: { type: Number, required: true },
  batchNumber: { type: String },
  expiryDate: { type: Date }
});

const GoodsReceivedNoteSchema = new Schema({
  grnNumber: { type: String, required: true, unique: true },
  purchaseOrder: { type: Schema.Types.ObjectId, ref: "PurchaseOrder" },
  supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
  supplierInvoiceNumber: { type: String },
  items: [GRNItemSchema],
  totalCost: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["Draft", "Verified", "Completed", "Cancelled"], 
    default: "Draft" 
  },
  receivedBy: { type: String, required: true },
  verifiedBy: { type: String },
  notes: { type: String }
}, { timestamps: true });

GoodsReceivedNoteSchema.index({ grnNumber: 1, supplier: 1 });

module.exports = mongoose.model("GoodsReceivedNote", GoodsReceivedNoteSchema);
