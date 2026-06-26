const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const QuotationItemSchema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: "Product" },
  productName: { type: String, required: true },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const QuotationSchema = new Schema({
  quotationNumber: { type: String, required: true, unique: true },
  customerReference: { type: Schema.Types.ObjectId, ref: "Customer" },
  customerName: { type: String, default: "Prospective Client" },
  cashier: { type: String, required: true },
  items: [QuotationItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ["Draft", "Sent", "Approved", "Invoiced", "Cancelled"], 
    default: "Draft" 
  },
  convertedInvoice: { type: Schema.Types.ObjectId, ref: "Invoice" },
  validUntil: { type: Date },
  notes: { type: String },
  pdfPath: { type: String }
}, { timestamps: true });

QuotationSchema.index({ quotationNumber: 1, customerName: 1 });

module.exports = mongoose.model("Quotation", QuotationSchema);
