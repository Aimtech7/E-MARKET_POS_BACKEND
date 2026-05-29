const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const Product = Schema({
  productName: { type: String, required: true },
  productCategory: {
    type: Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  unitOfMeasure: {
    type: Schema.Types.ObjectId,
    ref: "UnitOfMeasure",
    required: true,
  },
  productImage: { type: String, required:true },
  productPrice: { type: Number, required: true },
  costPrice: { type: Number, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 },
  barcode: { type: String },
  stockQuantity: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 5 },
  expiryDate: { type: Date },
  batchNumber: { type: String },
  supplierReference: { type: Schema.Types.ObjectId, ref: "Supplier" },
  sku: { type: String, unique: true, sparse: true },
  isArchived: { type: Boolean, default: false }
});

module.exports = mongoose.model("Product", Product);
