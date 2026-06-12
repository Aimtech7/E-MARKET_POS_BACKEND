const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const InvoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  cart: { type: Schema.Types.ObjectId, ref: "Cart", required: true },
  cashier: { type: String, required: true },
  amountPaid: { type: Number, required: true },
  changeGiven: { type: Number, required: true },
  paymentMethod: { type: String, default: "Cash" },
  paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed"], default: "Pending" },
  payments: [{ method: String, amount: Number }],
  customer: { type: Schema.Types.ObjectId, ref: "Customer" },
  timestamp: { type: Date, default: Date.now },
  pdfPath: { type: String }
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
