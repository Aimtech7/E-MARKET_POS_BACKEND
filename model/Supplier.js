const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const SupplierSchema = new Schema({
  supplierName: { type: String, required: true, unique: true },
  contactName: { type: String },
  email: { type: String },
  phone: { type: String },
  address: { type: String },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("Supplier", SupplierSchema);
