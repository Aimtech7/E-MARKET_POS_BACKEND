const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DeliveryNoteItemSchema = new Schema({
  productName: { type: String, required: true },
  qty: { type: Number, required: true },
  unit: { type: String, default: "pcs" }
});

const DeliveryNoteSchema = new Schema({
  deliveryNoteNumber: { type: String, required: true, unique: true },
  invoiceReference: { type: Schema.Types.ObjectId, ref: "Invoice" },
  customerReference: { type: Schema.Types.ObjectId, ref: "Customer" },
  customerName: { type: String, default: "Walk-in Customer" },
  deliveryAddress: { type: String },
  items: [DeliveryNoteItemSchema],
  deliveryStatus: { 
    type: String, 
    enum: ["Pending", "Dispatched", "Delivered", "Cancelled"], 
    default: "Pending" 
  },
  dispatchedBy: { type: String },
  receivedBy: { type: String },
  notes: { type: String },
  pdfPath: { type: String }
}, { timestamps: true });

DeliveryNoteSchema.index({ deliveryNoteNumber: 1, customerName: 1 });

module.exports = mongoose.model("DeliveryNote", DeliveryNoteSchema);
