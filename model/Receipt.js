const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const ReceiptSchema = new Schema({
  receiptNumber: { type: String, required: true, unique: true },
  invoiceReference: { type: Schema.Types.ObjectId, ref: "Invoice", required: true },
  cartReference: { type: Schema.Types.ObjectId, ref: "Cart", required: true },
  customer: { type: String, default: "Walk-in" },
  cashier: { type: String, required: true },
  items: [
    {
      productName: { type: String, required: true },
      qty: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
    }
  ],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  amountPaid: { type: Number, required: true },
  changeGiven: { type: Number, required: true },
  paymentMethod: { type: String, default: "Cash" },
  timestamp: { type: Date, default: Date.now },
  pdfPath: { type: String }
});

module.exports = mongoose.model("Receipt", ReceiptSchema);
